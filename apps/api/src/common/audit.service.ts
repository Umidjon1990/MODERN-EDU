import { Global, Inject, Injectable, Module } from '@nestjs/common';
import { auditLog, type Database } from '@modern-edu/db';
import { DRIZZLE } from '../db/db.module.js';

export type AuditEntry = {
  orgId: string;
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  context?: Record<string, unknown>;
};

@Injectable()
export class AuditService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.db.insert(auditLog).values({
      orgId: entry.orgId,
      actorId: entry.actorId ?? null,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      context: entry.context ?? {},
    });
  }
}

@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
