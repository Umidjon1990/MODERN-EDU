import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { DbModule } from './db/db.module.js';
import { AuditModule } from './common/audit.service.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [DbModule, AuditModule, AuthModule, UsersModule],
  controllers: [AppController],
})
export class AppModule {}
