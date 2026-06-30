import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ClassesModule } from '../classes/classes.module.js';
import { MessagesController } from './messages.controller.js';
import { MessagesService } from './messages.service.js';

@Module({
  imports: [AuthModule, ClassesModule], // TokenService + MembershipService
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
