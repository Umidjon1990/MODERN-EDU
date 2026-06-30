import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  createTeacherSchema,
  type AccessTokenClaims,
  type CreateTeacher,
} from '@modern-edu/contracts';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../authz/permissions.guard.js';
import { PERMISSIONS } from '../authz/permissions.js';
import { RequirePermissions } from '../authz/require-permissions.decorator.js';
import { UsersService } from './users.service.js';

@Controller('teachers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.TEACHER_CREATE)
  createTeacher(
    @CurrentUser() actor: AccessTokenClaims,
    @Body(new ZodValidationPipe(createTeacherSchema)) dto: CreateTeacher,
  ) {
    return this.users.createTeacher(actor, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.TEACHER_CREATE)
  list(@CurrentUser() actor: AccessTokenClaims) {
    return this.users.listTeachers(actor.orgId);
  }
}
