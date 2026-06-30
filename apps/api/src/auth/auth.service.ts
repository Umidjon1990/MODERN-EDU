import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { hashPassword, users, verifyPassword, type Database } from '@modern-edu/db';
import type { AccessTokenClaims, AuthResult, PublicUser } from '@modern-edu/contracts';
import { DRIZZLE } from '../db/db.module.js';
import { AuditService } from '../common/audit.service.js';
import { toPublicUser } from '../common/user.mapper.js';
import { TokenService } from './token.service.js';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  async login(username: string, password: string): Promise<AuthResult> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.username, username.trim().toLowerCase()), isNull(users.deletedAt)))
      .limit(1);

    const invalid = new UnauthorizedException('Login yoki parol noto‘g‘ri');
    if (!user || user.status !== 'active') throw invalid;

    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) throw invalid;

    await this.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    const issued = await this.tokens.createSession(user);
    await this.audit.log({ orgId: user.orgId, actorId: user.id, action: 'auth.login' });

    return {
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
      user: toPublicUser(user),
    };
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const { tokens, user } = await this.tokens.rotate(refreshToken);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: toPublicUser(user),
    };
  }

  async firstPasswordSet(claims: AccessTokenClaims, newPassword: string): Promise<AuthResult> {
    const passwordHash = await hashPassword(newPassword);
    await this.db
      .update(users)
      .set({ passwordHash, mustChangePassword: false })
      .where(eq(users.id, claims.sub));

    await this.tokens.revoke(claims.sid);
    const [user] = await this.db.select().from(users).where(eq(users.id, claims.sub)).limit(1);
    if (!user) throw new UnauthorizedException();

    const issued = await this.tokens.createSession(user);
    await this.audit.log({ orgId: user.orgId, actorId: user.id, action: 'auth.password_changed' });
    return {
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
      user: toPublicUser(user),
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.tokens.revoke(sessionId);
  }

  async me(userId: string): Promise<PublicUser> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new UnauthorizedException();
    return toPublicUser(user);
  }
}
