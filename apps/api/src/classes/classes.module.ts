import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PermissionsGuard } from '../authz/permissions.guard.js';
import { ClassesController } from './classes.controller.js';
import { ClassesService } from './classes.service.js';
import { MembershipService } from './membership.service.js';
import { StudentsService } from './students.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ClassesController],
  providers: [ClassesService, StudentsService, MembershipService, PermissionsGuard],
  exports: [MembershipService],
})
export class ClassesModule {}
