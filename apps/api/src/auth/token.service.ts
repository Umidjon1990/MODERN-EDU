import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { authSessions, users, type Database, type User } from '@modern-edu/db';
import { accessTokenClaimsSchema, type AccessTokenClaims } from '@modern-edu/contracts';
import { APP_ENV, DRIZZLE } from '../db/db.module.js';
import type { AppEnv } from '../config/env.js';

export type IssuedTokens = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
};

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class TokenService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  private signAccess(
    user: Pick<User, 'id' | 'orgId' | 'role' | 'mustChangePassword'>,
    sid: string,
  ): string {
    const claims: AccessTokenClaims = {
      sub: user.id,
      orgId: user.orgId,
      role: user.role,
      sid,
      mustChangePassword: user.mustChangePassword,
    };
    return jwt.sign(claims, this.env.JWT_ACCESS_SECRET, {
      expiresIn: this.env.ACCESS_TOKEN_TTL,
    } as jwt.SignOptions);
  }

  verifyAccess(token: string): AccessTokenClaims {
    try {
      const decoded = jwt.verify(token, this.env.JWT_ACCESS_SECRET);
      return accessTokenClaimsSchema.parse(decoded);
    } catch {
      throw new UnauthorizedException('Token yaroqsiz yoki muddati o‘tgan');
    }
  }

  /** Yangi sessiya yaratadi (kirishda). */
  async createSession(user: User): Promise<IssuedTokens> {
    const refreshToken = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + this.env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
    const [session] = await this.db
      .insert(authSessions)
      .values({ userId: user.id, refreshTokenHash: sha256(refreshToken), expiresAt })
      .returning({ id: authSessions.id });
    const sid = session!.id;
    return { accessToken: this.signAccess(user, sid), refreshToken, sessionId: sid };
  }

  /** Refresh tokenni aylantiradi (rotation + reuse himoyasi). */
  async rotate(refreshToken: string): Promise<{ tokens: IssuedTokens; user: User }> {
    const hash = sha256(refreshToken);
    const [session] = await this.db
      .select()
      .from(authSessions)
      .where(
        and(
          eq(authSessions.refreshTokenHash, hash),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!session) throw new UnauthorizedException('Sessiya yaroqsiz');

    const [user] = await this.db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (!user || user.deletedAt) throw new UnauthorizedException('Foydalanuvchi topilmadi');

    const newRefresh = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + this.env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
    await this.db
      .update(authSessions)
      .set({ refreshTokenHash: sha256(newRefresh), expiresAt })
      .where(eq(authSessions.id, session.id));

    return {
      tokens: {
        accessToken: this.signAccess(user, session.id),
        refreshToken: newRefresh,
        sessionId: session.id,
      },
      user,
    };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(eq(authSessions.id, sessionId));
  }
}
