import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  requestUploadSchema,
  type AccessTokenClaims,
  type RequestUpload,
} from '@modern-edu/contracts';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TokenService } from '../auth/token.service.js';
import { MediaService } from './media.service.js';

@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaSvc: MediaService,
    private readonly tokens: TokenService,
  ) {}

  @Post('upload-url')
  @UseGuards(JwtAuthGuard)
  requestUpload(
    @CurrentUser() actor: AccessTokenClaims,
    @Body(new ZodValidationPipe(requestUploadSchema)) dto: RequestUpload,
  ) {
    return this.mediaSvc.requestUpload(actor, dto);
  }

  @Post(':id/finalize')
  @UseGuards(JwtAuthGuard)
  finalize(@CurrentUser() actor: AccessTokenClaims, @Param('id', ParseUUIDPipe) id: string) {
    return this.mediaSvc.finalize(actor, id);
  }

  /**
   * Kontent — <img>/<a> uchun token query orqali ham qabul qilinadi.
   * Imzolangan S3 URL'ga 302 yo'naltiradi.
   */
  @Get(':id/content')
  async content(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const auth = token ?? req.headers.authorization?.replace('Bearer ', '');
    if (!auth) {
      res.status(401).json({ message: 'Avtorizatsiya talab qilinadi' });
      return;
    }
    const claims = this.tokens.verifyAccess(auth);
    const url = await this.mediaSvc.getContentUrl(claims.sub, id);
    res.redirect(302, url);
  }
}
