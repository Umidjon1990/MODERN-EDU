import { z } from 'zod';

/**
 * Foydalanuvchi rollari (docs/01 va docs/03 bilan mos).
 * v1 da Admin / O'qituvchi / O'quvchi ishlatiladi; super_admin va co_teacher
 * ma'lumotlar modelida boshidan zaxiralangan.
 */
export const userRoleSchema = z.enum(['super_admin', 'admin', 'teacher', 'co_teacher', 'student']);

export type UserRole = z.infer<typeof userRoleSchema>;

/** Sinf ichidagi rol (a'zolik qamrovi). */
export const classRoleSchema = z.enum(['teacher', 'co_teacher', 'student']);

export type ClassRole = z.infer<typeof classRoleSchema>;
