// Integratsiya testi — haqiqiy login/createTeacher oqimi PGlite (WASM Postgres)
// ustida. Argon2 hashlash ham haqiqiy. Bu Railway deploy'idan oldin auth oqimini
// tasdiqlaydi.
import 'reflect-metadata';
import path from 'node:path';
import { createRequire } from 'node:module';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { seed, type Database } from '@modern-edu/db';
import { beforeAll, describe, expect, it } from 'vitest';
import { AuditService } from '../common/audit.service.js';
import { UsersService } from '../users/users.service.js';
import type { AppEnv } from '../config/env.js';
import { AuthService } from './auth.service.js';
import { TokenService } from './token.service.js';

const require = createRequire(import.meta.url);
const migrationsFolder = path.join(
  path.dirname(require.resolve('@modern-edu/db')),
  '..',
  'drizzle',
);

const env: AppEnv = {
  NODE_ENV: 'test',
  PORT: 0,
  DATABASE_URL: 'pglite',
  JWT_ACCESS_SECRET: 'integration-access-secret-0123456789',
  JWT_REFRESH_SECRET: 'integration-refresh-secret-0123456789',
  ACCESS_TOKEN_TTL: '15m',
  REFRESH_TOKEN_TTL_DAYS: 30,
  CORS_ORIGIN: '*',
};

let auth: AuthService;
let tokens: TokenService;
let users: UsersService;

beforeAll(async () => {
  const pg = new PGlite();
  const db = drizzle(pg) as unknown as Database;
  await migrate(db as never, { migrationsFolder });
  await seed(db);

  const audit = new AuditService(db);
  tokens = new TokenService(db, env);
  auth = new AuthService(db, tokens, audit);
  users = new UsersService(db, audit);
});

describe('Auth oqimi (integratsiya)', () => {
  it('to‘g‘ri login va parol bilan token beradi', async () => {
    const result = await auth.login('admin', 'admin123');
    expect(result.user.username).toBe('admin');
    expect(result.user.role).toBe('admin');
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();

    // Berilgan access token tasdiqlanadi
    const claims = tokens.verifyAccess(result.accessToken);
    expect(claims.sub).toBe(result.user.id);
    expect(claims.role).toBe('admin');
  });

  it('noto‘g‘ri parolni rad etadi', async () => {
    await expect(auth.login('admin', 'wrong-password')).rejects.toThrow();
  });

  it('mavjud bo‘lmagan foydalanuvchini rad etadi', async () => {
    await expect(auth.login('yoq-bunday', 'x')).rejects.toThrow();
  });

  it('refresh token aylanadi va yangi token beradi', async () => {
    const first = await auth.login('teacher', 'teacher123');
    const refreshed = await auth.refresh(first.refreshToken);
    expect(refreshed.accessToken).toBeTruthy();
    expect(refreshed.refreshToken).not.toBe(first.refreshToken); // rotation
    // Eski refresh token endi ishlamaydi (rotation)
    await expect(auth.refresh(first.refreshToken)).rejects.toThrow();
  });

  it('admin o‘qituvchi yaratadi, yangi o‘qituvchi kira oladi (parol almashtirish bilan)', async () => {
    const adminLogin = await auth.login('admin', 'admin123');
    const adminClaims = tokens.verifyAccess(adminLogin.accessToken);

    const teacher = await users.createTeacher(adminClaims, {
      username: 'yangiustoz',
      fullName: 'Yangi Ustoz',
      password: 'vaqtincha123',
    });
    expect(teacher.role).toBe('teacher');
    expect(teacher.mustChangePassword).toBe(true);

    const login = await auth.login('yangiustoz', 'vaqtincha123');
    expect(login.user.mustChangePassword).toBe(true);

    // Birinchi kirishda parol almashtiriladi
    const claims = tokens.verifyAccess(login.accessToken);
    const after = await auth.firstPasswordSet(claims, 'yangiparol456');
    expect(after.user.mustChangePassword).toBe(false);
  });
});
