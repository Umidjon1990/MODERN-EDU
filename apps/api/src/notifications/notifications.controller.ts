import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import type { AccessTokenClaims } from '@modern-edu/contracts';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(@CurrentUser() actor: AccessTokenClaims) {
    const [items, unread] = await Promise.all([
      this.notifications.list(actor.sub),
      this.notifications.unreadCount(actor.sub),
    ]);
    return { items, unread };
  }

  @Post('read-all')
  @HttpCode(200)
  markAllRead(@CurrentUser() actor: AccessTokenClaims) {
    return this.notifications.markAllRead(actor.sub);
  }
}
