import type { User } from '@modern-edu/db';
import type { PublicUser } from '@modern-edu/contracts';

/** DB foydalanuvchisini mijozga xavfsiz (parolsiz) ko'rinishga aylantiradi. */
export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    orgId: u.orgId,
    role: u.role,
    username: u.username,
    fullName: u.fullName,
    email: u.email,
    avatarColor: u.avatarColor,
    mustChangePassword: u.mustChangePassword,
  };
}
