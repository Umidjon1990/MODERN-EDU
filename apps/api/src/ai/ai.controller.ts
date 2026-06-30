import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import {
  tutorRequestSchema,
  type AccessTokenClaims,
  type TutorRequest,
} from '@modern-edu/contracts';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AiService } from './ai.service.js';

@Controller()
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('classes/:classId/ai/tutor')
  tutor(
    @CurrentUser() actor: AccessTokenClaims,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body(new ZodValidationPipe(tutorRequestSchema)) dto: TutorRequest,
  ) {
    return this.ai.tutor(actor, classId, dto.question);
  }
}
