import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { DbModule } from './db/db.module.js';
import { AuditModule } from './common/audit.service.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { ClassesModule } from './classes/classes.module.js';
import { MessagesModule } from './messages/messages.module.js';
import { MediaModule } from './media/media.module.js';
import { AcademicModule } from './academic/academic.module.js';
import { RealtimeModule } from './realtime/realtime.publisher.js';
import { NotificationsCoreModule } from './notifications/notifications.service.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { AiModule } from './ai/ai.module.js';

@Module({
  imports: [
    DbModule,
    AuditModule,
    RealtimeModule,
    NotificationsCoreModule,
    AuthModule,
    UsersModule,
    ClassesModule,
    MessagesModule,
    MediaModule,
    AcademicModule,
    NotificationsModule,
    AiModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
