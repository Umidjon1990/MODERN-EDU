import { Global, Inject, Injectable, Module, type OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { Emitter } from '@socket.io/redis-emitter';
import { classRoom, type MessageDto, type ServerToClientEvents } from '@modern-edu/contracts';
import { APP_ENV } from '../db/db.module.js';
import type { AppEnv } from '../config/env.js';

/**
 * Realtime publisher — API DB'ga yozgandan so'ng socket xonalariga hodisa
 * chiqaradi (Redis emitter orqali). REDIS_URL bo'lmasa no-op (realtime o'chiq).
 */
@Injectable()
export class RealtimePublisher implements OnModuleDestroy {
  private redis?: Redis;
  private emitter?: Emitter<ServerToClientEvents>;

  constructor(@Inject(APP_ENV) env: AppEnv) {
    if (env.REDIS_URL) {
      this.redis = new Redis(env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: null });
      this.emitter = new Emitter<ServerToClientEvents>(this.redis);
    }
  }

  emitNew(classId: string, msg: MessageDto): void {
    this.emitter?.to(classRoom(classId)).emit('message:new', msg);
  }

  emitUpdate(classId: string, msg: MessageDto): void {
    this.emitter?.to(classRoom(classId)).emit('message:update', msg);
  }

  emitDelete(classId: string, messageId: string): void {
    this.emitter?.to(classRoom(classId)).emit('message:delete', { classId, messageId });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit();
  }
}

@Global()
@Module({
  providers: [RealtimePublisher],
  exports: [RealtimePublisher],
})
export class RealtimeModule {}
