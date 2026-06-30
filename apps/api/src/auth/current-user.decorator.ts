import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AccessTokenClaims } from '@modern-edu/contracts';

/** Joriy (autentifikatsiyalangan) foydalanuvchi claim'larini beradi. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessTokenClaims => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AccessTokenClaims }>();
    if (!req.user) throw new Error('CurrentUser faqat JwtAuthGuard ortida ishlatiladi');
    return req.user;
  },
);
