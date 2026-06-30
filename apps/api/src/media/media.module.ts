import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ClassesModule } from '../classes/classes.module.js';
import { APP_ENV } from '../db/db.module.js';
import type { AppEnv } from '../config/env.js';
import { MediaController } from './media.controller.js';
import { MediaService } from './media.service.js';
import { STORAGE, createStorage } from './storage.js';

@Module({
  imports: [AuthModule, ClassesModule], // TokenService + MembershipService
  controllers: [MediaController],
  providers: [
    MediaService,
    {
      provide: STORAGE,
      useFactory: (env: AppEnv) => createStorage(env),
      inject: [APP_ENV],
    },
  ],
})
export class MediaModule {}
