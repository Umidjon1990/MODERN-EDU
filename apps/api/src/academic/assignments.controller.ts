import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import {
  createAssignmentSchema,
  gradeSchema,
  submitWorkSchema,
  type AccessTokenClaims,
  type CreateAssignment,
  type GradeInput,
  type SubmitWork,
} from '@modern-edu/contracts';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AssignmentsService } from './assignments.service.js';

@Controller()
@UseGuards(JwtAuthGuard)
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Post('classes/:classId/assignments')
  create(
    @CurrentUser() actor: AccessTokenClaims,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body(new ZodValidationPipe(createAssignmentSchema)) dto: CreateAssignment,
  ) {
    return this.assignments.create(actor, classId, dto);
  }

  @Get('classes/:classId/assignments')
  list(@CurrentUser() actor: AccessTokenClaims, @Param('classId', ParseUUIDPipe) classId: string) {
    return this.assignments.listForClass(actor, classId);
  }

  @Post('assignments/:id/submissions')
  submit(
    @CurrentUser() actor: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(submitWorkSchema)) dto: SubmitWork,
  ) {
    return this.assignments.submit(actor, id, dto);
  }

  @Get('assignments/:id/submissions')
  submissions(@CurrentUser() actor: AccessTokenClaims, @Param('id', ParseUUIDPipe) id: string) {
    return this.assignments.listSubmissions(actor, id);
  }

  @Post('submissions/:id/grade')
  grade(
    @CurrentUser() actor: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(gradeSchema)) dto: GradeInput,
  ) {
    return this.assignments.grade(actor, id, dto);
  }
}
