import { z } from 'zod';
import { classRoleSchema } from './roles.js';

/** O'qituvchi sinf yaratadi. */
export const createClassSchema = z.object({
  name: z.string().min(1).max(128),
  subject: z.string().max(128).optional(),
  description: z.string().max(1000).optional(),
});
export type CreateClass = z.infer<typeof createClassSchema>;

/** Bitta o'quvchi (ommaviy yaratishda). */
export const createStudentSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9_.-]+$/i, 'Faqat harf, raqam, . _ - belgilari'),
  fullName: z.string().min(1).max(128),
  password: z.string().min(6).max(256).optional(), // berilmasa avtomatik yaratiladi
});
export type CreateStudent = z.infer<typeof createStudentSchema>;

export const createStudentsSchema = z.object({
  students: z.array(createStudentSchema).min(1).max(100),
});
export type CreateStudents = z.infer<typeof createStudentsSchema>;

/** Mijozga qaytariladigan sinf. */
export const publicClassSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  subject: z.string().nullable(),
  description: z.string().nullable(),
  ownerTeacherId: z.string().uuid(),
  status: z.enum(['active', 'archived']),
  lastMessageSeq: z.number().int(),
  memberCount: z.number().int().optional(),
});
export type PublicClass = z.infer<typeof publicClassSchema>;

/** Sinf a'zosi (roster). */
export const classMemberDtoSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string(),
  username: z.string(),
  roleInClass: classRoleSchema,
  avatarColor: z.string().nullable(),
});
export type ClassMemberDto = z.infer<typeof classMemberDtoSchema>;

/** Yangi o'quvchi login ma'lumoti (faqat yaratilganda qaytariladi). */
export const studentCredentialSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string(),
  username: z.string(),
  tempPassword: z.string(),
});
export type StudentCredential = z.infer<typeof studentCredentialSchema>;
