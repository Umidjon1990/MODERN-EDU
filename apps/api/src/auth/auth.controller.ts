import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  firstPasswordSetSchema,
  loginRequestSchema,
  refreshRequestSchema,
  type AccessTokenClaims,
  type AuthResult,
} from '@modern-edu/contracts';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { APP_ENV } from '../db/db.module.js';
import type { AppEnv } from '../config/env.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

const REFRESH_COOKIE = 'medu_refresh';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  private setRefreshCookie(res: Response, token: string): void {
    const prod = this.env.NODE_ENV === 'production';
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: prod,
      sameSite: prod ? 'none' : 'lax',
      path: '/',
      maxAge: this.env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
    });
  }

  private respond(res: Response, result: AuthResult): AuthResult {
    this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginRequestSchema)) body: { username: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResult> {
    return this.respond(res, await this.auth.login(body.username, body.password));
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body(new ZodValidationPipe(refreshRequestSchema)) body: { refreshToken?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResult> {
    const token = body.refreshToken ?? (req.cookies?.[REFRESH_COOKIE] as string | undefined);
    if (!token) {
      return this.respond(res, await this.auth.refresh(''));
    }
    return this.respond(res, await this.auth.refresh(token));
  }

  @Post('password/first-set')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async firstPasswordSet(
    @Body(new ZodValidationPipe(firstPasswordSetSchema)) body: { newPassword: string },
    @CurrentUser() user: AccessTokenClaims,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResult> {
    return this.respond(res, await this.auth.firstPasswordSet(user, body.newPassword));
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: AccessTokenClaims,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    await this.auth.logout(user.sid);
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AccessTokenClaims) {
    return this.auth.me(user.sub);
  }
}
