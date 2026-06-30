import type { messageReactions, messages } from '@modern-edu/db';
import type { AttachmentDto, MessageDto } from '@modern-edu/contracts';

type MessageRow = typeof messages.$inferSelect;
type ReactionRow = typeof messageReactions.$inferSelect;

/** Xabar qatorlarini reaksiya/pin/biriktirma bilan mijoz DTO'siga aylantiradi. */
export function toMessageDtos(
  rows: MessageRow[],
  reactions: ReactionRow[],
  pinnedIds: ReadonlySet<string>,
  attachmentsByMessage: ReadonlyMap<string, AttachmentDto[]>,
): MessageDto[] {
  const byMessage = new Map<string, Map<string, string[]>>();
  for (const r of reactions) {
    let emojis = byMessage.get(r.messageId);
    if (!emojis) {
      emojis = new Map();
      byMessage.set(r.messageId, emojis);
    }
    const users = emojis.get(r.emoji) ?? [];
    users.push(r.userId);
    emojis.set(r.emoji, users);
  }

  return rows.map((m) => {
    const grouped = byMessage.get(m.id);
    const reactionGroups = grouped
      ? [...grouped.entries()].map(([emoji, userIds]) => ({ emoji, userIds }))
      : [];
    return {
      id: m.id,
      classId: m.classId,
      seq: m.seq,
      senderId: m.senderId,
      type: m.type,
      body: m.deletedAt ? null : m.body,
      replyToId: m.replyToId,
      pinned: pinnedIds.has(m.id),
      reactions: reactionGroups,
      attachments: m.deletedAt ? [] : (attachmentsByMessage.get(m.id) ?? []),
      editedAt: m.editedAt ? m.editedAt.toISOString() : null,
      deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
      createdAt: m.createdAt.toISOString(),
    };
  });
}
