import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AccessTokenClaims } from '@modern-edu/contracts';
import { can } from './policy.js';
import { PERMISSIONS_KEY } from './require-permissions.decorator.js';
import type { Permission } from './permissions.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(PERMISSIONS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AccessTokenClaims }>();
    const user = req.user;
    if (!user) throw new ForbiddenException('Avtorizatsiya talab qilinadi');

    const ok = required.every((p) => can(user.role, p));
    if (!ok) throw new ForbiddenException('Ushbu amal uchun ruxsat yo‘q');
    return true;
  }
}
