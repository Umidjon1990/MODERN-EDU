import { Global, Inject, Injectable, Module } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { notifications, type Database, type Notification } from '@modern-edu/db';
import type { NotificationDto } from '@modern-edu/contracts';
import { DRIZZLE } from '../db/db.module.js';

type NotifInput = {
  userId: string;
  orgId: string;
  type: Notification['type'];
  title: string;
  body?: string | null;
  classId?: string | null;
};

function toDto(n: Notification): NotificationDto {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    classId: n.classId,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  };
}

@Injectable()
export class NotificationsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: NotifInput): Promise<void> {
    await this.db.insert(notifications).values({
      userId: input.userId,
      orgId: input.orgId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      classId: input.classId ?? null,
    });
  }

  async createMany(userIds: string[], base: Omit<NotifInput, 'userId'>): Promise<void> {
    if (userIds.length === 0) return;
    await this.db.insert(notifications).values(
      userIds.map((userId) => ({
        userId,
        orgId: base.orgId,
        type: base.type,
        title: base.title,
        body: base.body ?? null,
        classId: base.classId ?? null,
      })),
    );
  }

  async list(userId: string): Promise<NotificationDto[]> {
    const rows = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    return rows.map(toDto);
  }

  async unreadCount(userId: string): Promise<number> {
    const rows = await this.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return rows.length;
  }

  async markAllRead(userId: string): Promise<{ ok: true }> {
    await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return { ok: true };
  }
}

@Global()
@Module({
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsCoreModule {}
