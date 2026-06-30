import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsController } from './notifications.controller.js';

// NotificationsService global (NotificationsCoreModule) orqali beriladi.
@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
