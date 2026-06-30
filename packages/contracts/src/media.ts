import { z } from 'zod';

export const mediaKindSchema = z.enum(['image', 'video', 'audio', 'file', 'pdf']);
export type MediaKind = z.infer<typeof mediaKindSchema>;

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

/** Yuklash uchun ruxsat (presigned URL) so'rovi. */
export const requestUploadSchema = z.object({
  kind: mediaKindSchema,
  mimeType: z.string().min(1).max(128),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  fileName: z.string().max(256).optional(),
});
export type RequestUpload = z.infer<typeof requestUploadSchema>;

export const uploadTicketSchema = z.object({
  mediaId: z.string().uuid(),
  uploadUrl: z.string(),
  storageKey: z.string(),
});
export type UploadTicket = z.infer<typeof uploadTicketSchema>;

/** Xabarga biriktirilgan media (mijozga). */
export const attachmentDtoSchema = z.object({
  mediaId: z.string().uuid(),
  kind: mediaKindSchema,
  mimeType: z.string().nullable(),
  sizeBytes: z.number().nullable(),
  url: z.string(), // kontent endpointi (imzolangan URL'ga yo'naltiradi)
});
export type AttachmentDto = z.infer<typeof attachmentDtoSchema>;
