import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gt, lt, sql } from 'drizzle-orm';
import {
  classMembers,
  classes,
  messageReactions,
  messages,
  pinnedMessages,
  type Database,
} from '@modern-edu/db';
import type {
  AccessTokenClaims,
  CreateMessage,
  MessageDto,
  MessagesQuery,
} from '@modern-edu/contracts';
import { DRIZZLE } from '../db/db.module.js';
import { MembershipService } from '../classes/membership.service.js';
import { attachReactionsAndPins } from './message-query.js';

@Injectable()
export class MessagesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly membership: MembershipService,
  ) {}

  async list(userId: string, classId: string, q: MessagesQuery): Promise<MessageDto[]> {
    await this.membership.requireMembership(userId, classId);

    const conditions = [eq(messages.classId, classId)];
    if (q.beforeSeq !== undefined) conditions.push(lt(messages.seq, q.beforeSeq));
    if (q.afterSeq !== undefined) conditions.push(gt(messages.seq, q.afterSeq));

    const rows = await this.db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.seq))
      .limit(q.limit);
    rows.reverse(); // o'sish tartibida (eski → yangi)

    return attachReactionsAndPins(this.db, classId, rows);
  }

  async post(actor: AccessTokenClaims, classId: string, dto: CreateMessage): Promise<MessageDto> {
    await this.membership.requireMembership(actor.sub, classId);

    // Idempotentlik (optimistik UI qayta urinishlari)
    if (dto.clientMsgId) {
      const [existing] = await this.db
        .select()
        .from(messages)
        .where(and(eq(messages.classId, classId), eq(messages.clientMsgId, dto.clientMsgId)))
        .limit(1);
      if (existing) return (await attachReactionsAndPins(this.db, classId, [existing]))[0]!;
    }

    const created = await this.db.transaction(async (tx) => {
      const [cls] = await tx
        .update(classes)
        .set({ lastMessageSeq: sql`${classes.lastMessageSeq} + 1` })
        .where(eq(classes.id, classId))
        .returning({ seq: classes.lastMessageSeq });

      const [msg] = await tx
        .insert(messages)
        .values({
          classId,
          orgId: actor.orgId,
          seq: cls!.seq,
          senderId: actor.sub,
          type: dto.type,
          body: dto.body,
          replyToId: dto.replyToId ?? null,
          clientMsgId: dto.clientMsgId ?? null,
        })
        .returning();
      return msg!;
    });

    return (await attachReactionsAndPins(this.db, classId, [created]))[0]!;
  }

  async edit(actor: AccessTokenClaims, messageId: string, body: string): Promise<MessageDto> {
    const msg = await this.loadMessage(messageId);
    await this.membership.requireMembership(actor.sub, msg.classId);
    if (msg.senderId !== actor.sub) {
      throw new ForbiddenException('Faqat o‘z xabaringizni tahrirlay olasiz');
    }
    if (msg.deletedAt) throw new NotFoundException('Xabar o‘chirilgan');

    const [updated] = await this.db
      .update(messages)
      .set({ body, editedAt: new Date() })
      .where(eq(messages.id, messageId))
      .returning();
    return (await attachReactionsAndPins(this.db, msg.classId, [updated!]))[0]!;
  }

  async remove(actor: AccessTokenClaims, messageId: string): Promise<{ ok: true }> {
    const msg = await this.loadMessage(messageId);
    const member = await this.membership.requireMembership(actor.sub, msg.classId);
    const isOwner = msg.senderId === actor.sub;
    const isModerator = member.roleInClass !== 'student';
    if (!isOwner && !isModerator) {
      throw new ForbiddenException('Bu xabarni o‘chirish huquqi yo‘q');
    }
    await this.db.update(messages).set({ deletedAt: new Date() }).where(eq(messages.id, messageId));
    return { ok: true };
  }

  async toggleReaction(
    actor: AccessTokenClaims,
    messageId: string,
    emoji: string,
  ): Promise<MessageDto> {
    const msg = await this.loadMessage(messageId);
    await this.membership.requireMembership(actor.sub, msg.classId);

    const [existing] = await this.db
      .select({ id: messageReactions.id })
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.userId, actor.sub),
          eq(messageReactions.emoji, emoji),
        ),
      )
      .limit(1);

    if (existing) {
      await this.db.delete(messageReactions).where(eq(messageReactions.id, existing.id));
    } else {
      await this.db.insert(messageReactions).values({ messageId, userId: actor.sub, emoji });
    }
    return (await attachReactionsAndPins(this.db, msg.classId, [msg]))[0]!;
  }

  async setPin(
    actor: AccessTokenClaims,
    classId: string,
    messageId: string,
    pinned: boolean,
  ): Promise<{ ok: true }> {
    await this.membership.requireTeacher(actor.sub, classId);
    const [msg] = await this.db
      .select({ id: messages.id })
      .from(messages)
      .where(and(eq(messages.id, messageId), eq(messages.classId, classId)))
      .limit(1);
    if (!msg) throw new NotFoundException('Xabar topilmadi');

    if (pinned) {
      await this.db
        .insert(pinnedMessages)
        .values({ classId, messageId, pinnedById: actor.sub })
        .onConflictDoNothing();
    } else {
      await this.db
        .delete(pinnedMessages)
        .where(and(eq(pinnedMessages.classId, classId), eq(pinnedMessages.messageId, messageId)));
    }
    return { ok: true };
  }

  async markRead(
    actor: AccessTokenClaims,
    classId: string,
    seq: number,
  ): Promise<{ lastReadSeq: number }> {
    const member = await this.membership.requireMembership(actor.sub, classId);
    const next = Math.max(member.lastReadSeq, seq);
    if (next !== member.lastReadSeq) {
      await this.db
        .update(classMembers)
        .set({ lastReadSeq: next })
        .where(eq(classMembers.id, member.id));
    }
    return { lastReadSeq: next };
  }

  private async loadMessage(messageId: string): Promise<typeof messages.$inferSelect> {
    const [msg] = await this.db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
    if (!msg) throw new NotFoundException('Xabar topilmadi');
    return msg;
  }
}
