import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { hashPassword, users, type Database } from '@modern-edu/db';
import type { AccessTokenClaims, CreateTeacher, PublicUser } from '@modern-edu/contracts';
import { DRIZZLE } from '../db/db.module.js';
import { AuditService } from '../common/audit.service.js';
import { toPublicUser } from '../common/user.mapper.js';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  async createTeacher(actor: AccessTokenClaims, dto: CreateTeacher): Promise<PublicUser> {
    const username = dto.username.trim().toLowerCase();

    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.orgId, actor.orgId), eq(users.username, username)))
      .limit(1);
    if (existing) {
      throw new ConflictException('Bu login allaqachon band');
    }

    const [created] = await this.db
      .insert(users)
      .values({
        orgId: actor.orgId,
        role: 'teacher',
        username,
        email: dto.email ?? null,
        fullName: dto.fullName,
        passwordHash: await hashPassword(dto.password),
        mustChangePassword: true,
        avatarColor: '#4f46e5',
        createdById: actor.sub,
      })
      .returning();

    await this.audit.log({
      orgId: actor.orgId,
      actorId: actor.sub,
      action: 'teacher.create',
      targetType: 'user',
      targetId: created!.id,
      context: { username },
    });

    return toPublicUser(created!);
  }

  async listTeachers(orgId: string): Promise<PublicUser[]> {
    const rows = await this.db
      .select()
      .from(users)
      .where(and(eq(users.orgId, orgId), eq(users.role, 'teacher')));
    return rows.map(toPublicUser);
  }
}
