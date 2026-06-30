import { randomBytes } from 'node:crypto';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { classMembers, hashPassword, users, type Database } from '@modern-edu/db';
import type { AccessTokenClaims, CreateStudent, StudentCredential } from '@modern-edu/contracts';
import { DRIZZLE } from '../db/db.module.js';
import { AuditService } from '../common/audit.service.js';
import { MembershipService } from './membership.service.js';

const AVATAR_COLORS = ['#0ea5e9', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6'];

function generatePassword(): string {
  // O'qish oson, 8 belgili vaqtinchalik parol
  return randomBytes(6)
    .toString('base64url')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8)
    .padEnd(8, '0');
}

@Injectable()
export class StudentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly membership: MembershipService,
    private readonly audit: AuditService,
  ) {}

  async createStudents(
    actor: AccessTokenClaims,
    classId: string,
    input: CreateStudent[],
  ): Promise<StudentCredential[]> {
    await this.membership.requireTeacher(actor.sub, classId);

    const credentials: StudentCredential[] = [];
    let i = 0;
    for (const s of input) {
      const username = s.username.trim().toLowerCase();

      const [existing] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.orgId, actor.orgId), eq(users.username, username)))
        .limit(1);
      if (existing) throw new ConflictException(`Login band: ${username}`);

      const tempPassword = s.password ?? generatePassword();
      const [user] = await this.db
        .insert(users)
        .values({
          orgId: actor.orgId,
          role: 'student',
          username,
          fullName: s.fullName,
          passwordHash: await hashPassword(tempPassword),
          mustChangePassword: true,
          avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length]!,
          createdById: actor.sub,
        })
        .returning();

      await this.db
        .insert(classMembers)
        .values({ classId, userId: user!.id, roleInClass: 'student' });

      credentials.push({ userId: user!.id, fullName: s.fullName, username, tempPassword });
      i += 1;
    }

    await this.audit.log({
      orgId: actor.orgId,
      actorId: actor.sub,
      action: 'student.create',
      targetType: 'class',
      targetId: classId,
      context: { count: credentials.length },
    });

    return credentials;
  }
}
