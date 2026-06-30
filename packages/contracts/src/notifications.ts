import { z } from 'zod';

export const notificationTypeSchema = z.enum([
  'message',
  'announcement',
  'assignment',
  'graded',
  'mention',
  'system',
]);

export const notificationDtoSchema = z.object({
  id: z.string().uuid(),
  type: notificationTypeSchema,
  title: z.string(),
  body: z.string().nullable(),
  classId: z.string().uuid().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export type NotificationDto = z.infer<typeof notificationDtoSchema>;
