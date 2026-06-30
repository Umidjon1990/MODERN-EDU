import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ClassesModule } from '../classes/classes.module.js';
import { APP_ENV } from '../db/db.module.js';
import type { AppEnv } from '../config/env.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { AI_PROVIDER, createAiProvider } from './ai.provider.js';

@Module({
  imports: [AuthModule, ClassesModule],
  controllers: [AiController],
  providers: [
    AiService,
    {
      provide: AI_PROVIDER,
      useFactory: (env: AppEnv) => createAiProvider(env),
      inject: [APP_ENV],
    },
  ],
})
export class AiModule {}
