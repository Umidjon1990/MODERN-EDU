import { z } from 'zod';
import { userRoleSchema } from './roles.js';

/** Kirish so'rovi. */
export const loginRequestSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** Birinchi kirishda majburiy parol o'rnatish. */
export const firstPasswordSetSchema = z.object({
  newPassword: z.string().min(8).max(256),
});
export type FirstPasswordSet = z.infer<typeof firstPasswordSetSchema>;

/** Refresh so'rovi (token tana yoki cookie orqali kelishi mumkin). */
export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

/** Admin o'qituvchi yaratadi. */
export const createTeacherSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9_.-]+$/i, 'Faqat harf, raqam, . _ - belgilari'),
  fullName: z.string().min(1).max(128),
  email: z.string().email().max(254).optional(),
  password: z.string().min(8).max(256),
});
export type CreateTeacher = z.infer<typeof createTeacherSchema>;

/** JWT access token ichidagi ma'lumot. */
export const accessTokenClaimsSchema = z.object({
  sub: z.string().uuid(), // user id
  orgId: z.string().uuid(),
  role: userRoleSchema,
  sid: z.string().uuid(), // session id
  mustChangePassword: z.boolean(),
});
export type AccessTokenClaims = z.infer<typeof accessTokenClaimsSchema>;

/** Mijozga qaytariladigan foydalanuvchi ma'lumoti (parolsiz). */
export const publicUserSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  role: userRoleSchema,
  username: z.string(),
  fullName: z.string(),
  email: z.string().nullable(),
  avatarColor: z.string().nullable(),
  mustChangePassword: z.boolean(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

/** Kirish/refresh javobi. */
export const authResultSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: publicUserSchema,
});
export type AuthResult = z.infer<typeof authResultSchema>;
