import { randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { media, messageAttachments, messages, type Database } from '@modern-edu/db';
import type { AccessTokenClaims, RequestUpload, UploadTicket } from '@modern-edu/contracts';
import { DRIZZLE } from '../db/db.module.js';
import { AuditService } from '../common/audit.service.js';
import { MembershipService } from '../classes/membership.service.js';
import { STORAGE, type StorageProvider } from './storage.js';

@Injectable()
export class MediaService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    @Inject(STORAGE) private readonly storage: StorageProvider,
    private readonly membership: MembershipService,
    private readonly audit: AuditService,
  ) {}

  async requestUpload(actor: AccessTokenClaims, dto: RequestUpload): Promise<UploadTicket> {
    const storageKey = `${actor.orgId}/${randomUUID()}`;
    const [row] = await this.db
      .insert(media)
      .values({
        orgId: actor.orgId,
        ownerId: actor.sub,
        kind: dto.kind,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        storageKey,
        status: 'pending',
      })
      .returning({ id: media.id });

    const uploadUrl = await this.storage.presignUpload(storageKey, dto.mimeType);
    return { mediaId: row!.id, uploadUrl, storageKey };
  }

  async finalize(
    actor: AccessTokenClaims,
    mediaId: string,
  ): Promise<{ id: string; status: string }> {
    const [m] = await this.db.select().from(media).where(eq(media.id, mediaId)).limit(1);
    if (!m || m.orgId !== actor.orgId) throw new NotFoundException('Media topilmadi');
    if (m.ownerId !== actor.sub) throw new ForbiddenException('Ruxsat yo‘q');

    // Yuklanganini tasdiqlash (o'lcham/turni yangilash)
    let sizeBytes = m.sizeBytes;
    let mimeType = m.mimeType;
    try {
      const head = await this.storage.head(m.storageKey);
      if (head.size !== undefined) sizeBytes = head.size;
      if (head.contentType) mimeType = head.contentType;
    } catch {
      // head muvaffaqiyatsiz — baribir ready deb belgilaymiz (skan keyin)
    }

    await this.db
      .update(media)
      .set({ status: 'ready', sizeBytes, mimeType })
      .where(eq(media.id, mediaId));
    await this.audit.log({
      orgId: actor.orgId,
      actorId: actor.sub,
      action: 'media.upload',
      targetType: 'media',
      targetId: mediaId,
    });
    return { id: mediaId, status: 'ready' };
  }

  /** Kontentga imzolangan URL — faqat egasi yoki media biriktirilgan sinf a'zosi. */
  async getContentUrl(userId: string, mediaId: string): Promise<string> {
    const [m] = await this.db.select().from(media).where(eq(media.id, mediaId)).limit(1);
    if (!m || m.deletedAt) throw new NotFoundException('Media topilmadi');

    if (m.ownerId === userId) return this.storage.presignDownload(m.storageKey);

    const classRows = await this.db
      .select({ classId: messages.classId })
      .from(messageAttachments)
      .innerJoin(messages, eq(messageAttachments.messageId, messages.id))
      .where(eq(messageAttachments.mediaId, mediaId));

    for (const { classId } of classRows) {
      const member = await this.membership.getMembership(userId, classId);
      if (member) return this.storage.presignDownload(m.storageKey);
    }
    throw new ForbiddenException('Bu faylga kirish huquqi yo‘q');
  }

  /** Foydalanuvchining tashkilotidagi media (tekshiruv yordamchisi). */
  async assertOrgMedia(orgId: string, mediaIds: string[]): Promise<void> {
    if (mediaIds.length === 0) return;
    const rows = await this.db
      .select({ id: media.id })
      .from(media)
      .where(and(inArray(media.id, mediaIds), eq(media.orgId, orgId)));
    if (rows.length !== mediaIds.length) throw new NotFoundException('Biriktirma topilmadi');
  }
}
