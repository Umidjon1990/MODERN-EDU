import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ClassesModule } from '../classes/classes.module.js';
import { AssignmentsController } from './assignments.controller.js';
import { AssignmentsService } from './assignments.service.js';

@Module({
  imports: [AuthModule, ClassesModule], // TokenService + MembershipService
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
})
export class AcademicModule {}
