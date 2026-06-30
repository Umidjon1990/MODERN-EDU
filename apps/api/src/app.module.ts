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

@Module({
  imports: [
    DbModule,
    AuditModule,
    RealtimeModule,
    AuthModule,
    UsersModule,
    ClassesModule,
    MessagesModule,
    MediaModule,
    AcademicModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
