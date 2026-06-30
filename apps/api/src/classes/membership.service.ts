import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { classMembers, type ClassMember, type Database } from '@modern-edu/db';
import { DRIZZLE } from '../db/db.module.js';

/**
 * A'zolik — maxfiylik/xavfsizlik chegarasi (docs/06 #23).
 * Har bir sinfxona so'rovi shu yerdan o'tadi: foydalanuvchi faqat o'zi a'zo
 * bo'lgan sinfga kira oladi.
 */
@Injectable()
export class MembershipService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async getMembership(userId: string, classId: string): Promise<ClassMember | null> {
    const [m] = await this.db
      .select()
      .from(classMembers)
      .where(
        and(
          eq(classMembers.userId, userId),
          eq(classMembers.classId, classId),
          isNull(classMembers.removedAt),
        ),
      )
      .limit(1);
    return m ?? null;
  }

  async requireMembership(userId: string, classId: string): Promise<ClassMember> {
    const m = await this.getMembership(userId, classId);
    if (!m) throw new ForbiddenException('Bu sinfga kirish huquqi yo‘q');
    return m;
  }

  /** O'qituvchi yoki ko-o'qituvchi ekanini talab qiladi. */
  async requireTeacher(userId: string, classId: string): Promise<ClassMember> {
    const m = await this.requireMembership(userId, classId);
    if (m.roleInClass === 'student') {
      throw new ForbiddenException('Bu amal faqat o‘qituvchi uchun');
    }
    return m;
  }
}
