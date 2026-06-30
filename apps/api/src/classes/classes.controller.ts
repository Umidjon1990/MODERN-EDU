import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import {
  createClassSchema,
  createStudentsSchema,
  type AccessTokenClaims,
  type CreateClass,
  type CreateStudents,
} from '@modern-edu/contracts';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../authz/permissions.guard.js';
import { PERMISSIONS } from '../authz/permissions.js';
import { RequirePermissions } from '../authz/require-permissions.decorator.js';
import { ClassesService } from './classes.service.js';
import { StudentsService } from './students.service.js';

@Controller('classes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClassesController {
  constructor(
    private readonly classes: ClassesService,
    private readonly students: StudentsService,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.CLASS_CREATE)
  create(
    @CurrentUser() actor: AccessTokenClaims,
    @Body(new ZodValidationPipe(createClassSchema)) dto: CreateClass,
  ) {
    return this.classes.createClass(actor, dto);
  }

  @Get()
  listMine(@CurrentUser() actor: AccessTokenClaims) {
    return this.classes.listMyClasses(actor.sub);
  }

  @Get(':id')
  classroom(@CurrentUser() actor: AccessTokenClaims, @Param('id', ParseUUIDPipe) id: string) {
    return this.classes.getClassroom(actor.sub, id);
  }

  @Get(':id/members')
  roster(@CurrentUser() actor: AccessTokenClaims, @Param('id', ParseUUIDPipe) id: string) {
    return this.classes.getRoster(actor.sub, id);
  }

  @Post(':id/students')
  @RequirePermissions(PERMISSIONS.STUDENT_CREATE)
  createStudents(
    @CurrentUser() actor: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(createStudentsSchema)) dto: CreateStudents,
  ) {
    return this.students.createStudents(actor, id, dto.students);
  }
}
