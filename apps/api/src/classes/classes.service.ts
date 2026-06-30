import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { classMembers, classes, messages, users, type Database } from '@modern-edu/db';
import type {
  AccessTokenClaims,
  ClassMemberDto,
  CreateClass,
  PublicClass,
} from '@modern-edu/contracts';
import { DRIZZLE } from '../db/db.module.js';
import { AuditService } from '../common/audit.service.js';
import { MembershipService } from './membership.service.js';
import { attachReactionsAndPins } from '../messages/message-query.js';

@Injectable()
export class ClassesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly membership: MembershipService,
    private readonly audit: AuditService,
  ) {}

  async createClass(actor: AccessTokenClaims, dto: CreateClass): Promise<PublicClass> {
    const [created] = await this.db
      .insert(classes)
      .values({
        orgId: actor.orgId,
        name: dto.name,
        subject: dto.subject ?? null,
        description: dto.description ?? null,
        ownerTeacherId: actor.sub,
      })
      .returning();

    await this.db
      .insert(classMembers)
      .values({ classId: created!.id, userId: actor.sub, roleInClass: 'teacher' });

    await this.audit.log({
      orgId: actor.orgId,
      actorId: actor.sub,
      action: 'class.create',
      targetType: 'class',
      targetId: created!.id,
    });

    return this.toPublicClass(created!);
  }

  async listMyClasses(userId: string): Promise<PublicClass[]> {
    const rows = await this.db
      .select({ cls: classes })
      .from(classMembers)
      .innerJoin(classes, eq(classMembers.classId, classes.id))
      .where(and(eq(classMembers.userId, userId), isNull(classMembers.removedAt)));
    return rows.map((r) => this.toPublicClass(r.cls));
  }

  async getRoster(userId: string, classId: string): Promise<ClassMemberDto[]> {
    await this.membership.requireMembership(userId, classId);
    const rows = await this.db
      .select({
        userId: classMembers.userId,
        roleInClass: classMembers.roleInClass,
        fullName: users.fullName,
        username: users.username,
        avatarColor: users.avatarColor,
      })
      .from(classMembers)
      .innerJoin(users, eq(classMembers.userId, users.id))
      .where(and(eq(classMembers.classId, classId), isNull(classMembers.removedAt)));
    return rows;
  }

  /** Sinfxona bosh sahifasi uchun yagona payload. */
  async getClassroom(userId: string, classId: string) {
    const member = await this.membership.requireMembership(userId, classId);

    const [cls] = await this.db.select().from(classes).where(eq(classes.id, classId)).limit(1);
    if (!cls) throw new NotFoundException('Sinf topilmadi');

    const roster = await this.getRoster(userId, classId);

    // So'nggi xabarlar (oxirgi 30)
    const recent = await this.db
      .select()
      .from(messages)
      .where(eq(messages.classId, classId))
      .orderBy(desc(messages.seq))
      .limit(30);
    recent.reverse();

    const recentDtos = await attachReactionsAndPins(this.db, classId, recent);

    return {
      class: this.toPublicClass(cls, roster.length),
      members: roster,
      messages: recentDtos,
      pinned: recentDtos.filter((m) => m.pinned),
      myLastReadSeq: member.lastReadSeq,
    };
  }

  private toPublicClass(c: typeof classes.$inferSelect, memberCount?: number): PublicClass {
    return {
      id: c.id,
      name: c.name,
      subject: c.subject,
      description: c.description,
      ownerTeacherId: c.ownerTeacherId,
      status: c.status,
      lastMessageSeq: c.lastMessageSeq,
      ...(memberCount !== undefined ? { memberCount } : {}),
    };
  }
}
