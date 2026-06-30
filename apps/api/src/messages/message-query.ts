import { and, eq, inArray } from 'drizzle-orm';
import { messageReactions, messages, pinnedMessages, type Database } from '@modern-edu/db';
import type { MessageDto } from '@modern-edu/contracts';
import { toMessageDtos } from './message.mapper.js';

type MessageRow = typeof messages.$inferSelect;

/** Xabar qatorlariga reaksiya va pin holatini biriktirib DTO qaytaradi. */
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

  return toMessageDtos(rows, reactions, pinnedSet);
}
