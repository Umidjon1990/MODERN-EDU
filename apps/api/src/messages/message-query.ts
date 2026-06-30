import { and, eq, inArray } from 'drizzle-orm';
import {
  media,
  messageAttachments,
  messageReactions,
  messages,
  pinnedMessages,
  type Database,
} from '@modern-edu/db';
import type { AttachmentDto, MessageDto } from '@modern-edu/contracts';
import { toMessageDtos } from './message.mapper.js';

type MessageRow = typeof messages.$inferSelect;

/** Media kontent endpointi (mijoz token bilan chaqiradi). */
export function mediaContentPath(mediaId: string): string {
  return `/api/v1/media/${mediaId}/content`;
}

/** Xabar qatorlariga reaksiya, pin va biriktirmalarni biriktirib DTO qaytaradi. */
export async function attachReactionsAndPins(
  db: Database,
  classId: string,
  rows: MessageRow[],
): Promise<MessageDto[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const reactions = await db
    .select()
    .from(messageReactions)
    .where(inArray(messageReactions.messageId, ids));

  const pins = await db
    .select({ messageId: pinnedMessages.messageId })
    .from(pinnedMessages)
    .where(and(eq(pinnedMessages.classId, classId), inArray(pinnedMessages.messageId, ids)));
  const pinnedSet = new Set(pins.map((p) => p.messageId));

  const attachmentRows = await db
    .select({
      messageId: messageAttachments.messageId,
      position: messageAttachments.position,
      mediaId: media.id,
      kind: media.kind,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
    })
    .from(messageAttachments)
    .innerJoin(media, eq(messageAttachments.mediaId, media.id))
    .where(inArray(messageAttachments.messageId, ids));

  const attachmentsByMessage = new Map<string, AttachmentDto[]>();
  for (const a of attachmentRows) {
    const list = attachmentsByMessage.get(a.messageId) ?? [];
    list.push({
      mediaId: a.mediaId,
      kind: a.kind,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      url: mediaContentPath(a.mediaId),
    });
    attachmentsByMessage.set(a.messageId, list);
  }

  return toMessageDtos(rows, reactions, pinnedSet, attachmentsByMessage);
}
