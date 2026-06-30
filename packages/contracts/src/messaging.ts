import { z } from 'zod';
import { attachmentDtoSchema } from './media.js';

export const messageTypeSchema = z.enum([
  'text',
  'image',
  'file',
  'pdf',
  'voice',
  'link',
  'system',
  'announcement',
  'ai',
]);
export type MessageTypeDto = z.infer<typeof messageTypeSchema>;

/** Xabar yuborish. Matn yoki media (yoki ikkalasi) bo'lishi mumkin. */
export const createMessageSchema = z
  .object({
    body: z.string().max(4000).optional(),
    type: messageTypeSchema.default('text'),
    replyToId: z.string().uuid().optional(),
    clientMsgId: z.string().uuid().optional(), // idempotentlik / optimistik UI
    mediaIds: z.array(z.string().uuid()).max(10).optional(),
  })
  .refine((d) => (d.body && d.body.trim().length > 0) || (d.mediaIds && d.mediaIds.length > 0), {
    message: 'Xabar matni yoki fayl bo‘lishi kerak',
  });
export type CreateMessage = z.infer<typeof createMessageSchema>;

export const editMessageSchema = z.object({
  body: z.string().min(1).max(4000),
});
export type EditMessage = z.infer<typeof editMessageSchema>;

export const reactionSchema = z.object({
  emoji: z.string().min(1).max(16),
});
export type ReactionInput = z.infer<typeof reactionSchema>;

/** Tarix sahifalash so'rovi (eski xabarlarni yuklash). */
export const messagesQuerySchema = z.object({
  beforeSeq: z.coerce.number().int().positive().optional(),
  afterSeq: z.coerce.number().int().nonnegative().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type MessagesQuery = z.infer<typeof messagesQuerySchema>;

export const markReadSchema = z.object({
  seq: z.coerce.number().int().nonnegative(),
});
export type MarkRead = z.infer<typeof markReadSchema>;

export const reactionGroupSchema = z.object({
  emoji: z.string(),
  userIds: z.array(z.string().uuid()),
});

/** Mijozga qaytariladigan xabar. */
export const messageDtoSchema = z.object({
  id: z.string().uuid(),
  classId: z.string().uuid(),
  seq: z.number().int(),
  senderId: z.string().uuid().nullable(),
  type: messageTypeSchema,
  body: z.string().nullable(),
  replyToId: z.string().uuid().nullable(),
  pinned: z.boolean(),
  reactions: z.array(reactionGroupSchema),
  attachments: z.array(attachmentDtoSchema),
  editedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type MessageDto = z.infer<typeof messageDtoSchema>;
