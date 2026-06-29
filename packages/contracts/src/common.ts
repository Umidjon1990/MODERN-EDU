import { z } from 'zod';

/**
 * Umumiy primitivlar — barcha sxemalar shularga tayanadi.
 * Ma'lumotlar bazasi dizayni (docs/03) bilan mos: UUID v7 birlamchi kalitlar,
 * UTC timestamp'lar.
 */

/** Barcha obyektlar uchun identifikator (UUID). */
export const uuidSchema = z.string().uuid();

/** ISO-8601 (UTC) vaqt belgisi. */
export const timestampSchema = z.string().datetime({ offset: true });

/** Yumshoq-o'chiriladigan / kuzatiladigan obyektlar uchun umumiy maydonlar. */
export const auditTimestamps = z.object({
  createdAt: timestampSchema,
  updatedAt: timestampSchema.nullable().optional(),
  deletedAt: timestampSchema.nullable().optional(),
});

export type Uuid = z.infer<typeof uuidSchema>;
export type Timestamp = z.infer<typeof timestampSchema>;
export type AuditTimestamps = z.infer<typeof auditTimestamps>;
