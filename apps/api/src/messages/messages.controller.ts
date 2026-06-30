import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createMessageSchema,
  editMessageSchema,
  markReadSchema,
  messagesQuerySchema,
  reactionSchema,
  type AccessTokenClaims,
  type CreateMessage,
  type EditMessage,
  type MarkRead,
  type MessagesQuery,
  type ReactionInput,
} from '@modern-edu/contracts';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { MessagesService } from './messages.service.js';

@Controller()
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('classes/:classId/messages')
  list(
    @CurrentUser() actor: AccessTokenClaims,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query(new ZodValidationPipe(messagesQuerySchema)) q: MessagesQuery,
  ) {
    return this.messages.list(actor.sub, classId, q);
  }

  @Post('classes/:classId/messages')
  post(
    @CurrentUser() actor: AccessTokenClaims,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body(new ZodValidationPipe(createMessageSchema)) dto: CreateMessage,
  ) {
    return this.messages.post(actor, classId, dto);
  }

  @Patch('messages/:id')
  edit(
    @CurrentUser() actor: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(editMessageSchema)) dto: EditMessage,
  ) {
    return this.messages.edit(actor, id, dto.body);
  }

  @Delete('messages/:id')
  remove(@CurrentUser() actor: AccessTokenClaims, @Param('id', ParseUUIDPipe) id: string) {
    return this.messages.remove(actor, id);
  }

  @Post('messages/:id/reactions')
  @HttpCode(200)
  react(
    @CurrentUser() actor: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(reactionSchema)) dto: ReactionInput,
  ) {
    return this.messages.toggleReaction(actor, id, dto.emoji);
  }

  @Post('classes/:classId/messages/:messageId/pin')
  @HttpCode(200)
  pin(
    @CurrentUser() actor: AccessTokenClaims,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    return this.messages.setPin(actor, classId, messageId, true);
  }

  @Delete('classes/:classId/messages/:messageId/pin')
  unpin(
    @CurrentUser() actor: AccessTokenClaims,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    return this.messages.setPin(actor, classId, messageId, false);
  }

  @Post('classes/:classId/read')
  @HttpCode(200)
  markRead(
    @CurrentUser() actor: AccessTokenClaims,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body(new ZodValidationPipe(markReadSchema)) dto: MarkRead,
  ) {
    return this.messages.markRead(actor, classId, dto.seq);
  }
}
