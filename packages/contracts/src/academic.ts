import { z } from 'zod';

/** O'qituvchi vazifa yaratadi. */
export const createAssignmentSchema = z.object({
  title: z.string().min(1).max(200),
  instructions: z.string().max(8000).optional(),
  dueAt: z.string().datetime({ offset: true }).optional(),
  pointsPossible: z.number().int().min(1).max(1000).default(100),
});
export type CreateAssignment = z.infer<typeof createAssignmentSchema>;

/** O'quvchi ish topshiradi. */
export const submitWorkSchema = z
  .object({
    body: z.string().max(8000).optional(),
    mediaIds: z.array(z.string().uuid()).max(10).optional(),
  })
  .refine((d) => (d.body && d.body.trim().length > 0) || (d.mediaIds && d.mediaIds.length > 0), {
    message: 'Matn yoki fayl bo‘lishi kerak',
  });
export type SubmitWork = z.infer<typeof submitWorkSchema>;

/** O'qituvchi baholaydi. */
export const gradeSchema = z.object({
  grade: z.number().int().min(0).max(1000),
  feedback: z.string().max(4000).optional(),
});
export type GradeInput = z.infer<typeof gradeSchema>;

export const submissionDtoSchema = z.object({
  id: z.string().uuid(),
  assignmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  studentName: z.string().optional(),
  body: z.string().nullable(),
  status: z.enum(['draft', 'submitted', 'returned', 'resubmitted']),
  submittedAt: z.string().nullable(),
  grade: z.number().int().nullable(),
  feedback: z.string().nullable(),
  gradedAt: z.string().nullable(),
});
export type SubmissionDto = z.infer<typeof submissionDtoSchema>;

export const assignmentDtoSchema = z.object({
  id: z.string().uuid(),
  classId: z.string().uuid(),
  title: z.string(),
  instructions: z.string().nullable(),
  dueAt: z.string().nullable(),
  pointsPossible: z.number().int(),
  status: z.enum(['draft', 'published', 'closed']),
  createdAt: z.string(),
  submissionCount: z.number().int().optional(), // o'qituvchi uchun
  mySubmission: submissionDtoSchema.nullable().optional(), // o'quvchi uchun
});
export type AssignmentDto = z.infer<typeof assignmentDtoSchema>;
