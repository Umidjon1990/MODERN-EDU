// D8 — AI repetitor testi (soxta provayder bilan, Claude chaqirmasdan).
import 'reflect-metadata';
import path from 'node:path';
import { createRequire } from 'node:module';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { aiMessages, seed, type Database } from '@modern-edu/db';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { AccessTokenClaims } from '@modern-edu/contracts';
import { AuditService } from '../common/audit.service.js';
import { AuthService } from '../auth/auth.service.js';
import { TokenService } from '../auth/token.service.js';
import { MembershipService } from '../classes/membership.service.js';
import { ClassesService } from '../classes/classes.service.js';
import type { AppEnv } from '../config/env.js';
import { AiService } from './ai.service.js';
import type { AiProvider } from './ai.provider.js';

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
  JWT_ACCESS_SECRET: 'd8-access-secret-0123456789',
  JWT_REFRESH_SECRET: 'd8-refresh-secret-0123456789',
  ACCESS_TOKEN_TTL: '15m',
  REFRESH_TOKEN_TTL_DAYS: 30,
  CORS_ORIGIN: '*',
  S3_REGION: 'auto',
  S3_FORCE_PATH_STYLE: false,
  AI_MODEL: 'claude-sonnet-4-6',
};

let db: Database;
let auth: AuthService;
let tokens: TokenService;
let classesSvc: ClassesService;
let aiSvc: AiService;
const completeMock = vi.fn();

const fakeProvider: AiProvider = {
  enabled: true,
  complete: completeMock,
};

async function loginClaims(u: string, p: string): Promise<AccessTokenClaims> {
  return tokens.verifyAccess((await auth.login(u, p)).accessToken);
}

beforeAll(async () => {
  const pg = new PGlite();
  db = drizzle(pg) as unknown as Database;
  await migrate(db as never, { migrationsFolder });
  await seed(db);
  const audit = new AuditService(db);
  const membership = new MembershipService(db);
  tokens = new TokenService(db, env);
  auth = new AuthService(db, tokens, audit);
  classesSvc = new ClassesService(db, membership, audit);
  aiSvc = new AiService(db, fakeProvider, env, membership);
});

describe('D8 — AI repetitor', () => {
  it('a’zo o‘quvchi savol berib javob oladi va log yoziladi', async () => {
    completeMock.mockResolvedValue({
      text: 'Avval ikkala tomonni 2 ga bo‘lamiz...',
      model: 'claude-sonnet-4-6',
      tokensIn: 50,
      tokensOut: 30,
    });

    const teacher = await loginClaims('teacher', 'teacher123');
    const klass = await classesSvc.createClass(teacher, { name: 'AI sinfi', subject: 'Algebra' });

    const res = await aiSvc.tutor(teacher, klass.id, '2x = 10 ni qanday yechaman?');
    expect(res.answer).toContain('bo‘lamiz');
    expect(res.model).toBe('claude-sonnet-4-6');

    // System prompt fan nomini o'z ichiga oladi
    const callArg = completeMock.mock.calls[0]![0] as { system: string; model: string };
    expect(callArg.system).toContain('Algebra');
    expect(callArg.model).toBe('claude-sonnet-4-6');

    // Log yozildi
    const logs = await db.select().from(aiMessages);
    expect(logs.length).toBeGreaterThan(0);
  });

  it('🔒 a’zo bo‘lmagan foydalanuvchi repetitordan foydalana olmaydi', async () => {
    const teacher = await loginClaims('teacher', 'teacher123');
    const klass = await classesSvc.createClass(teacher, { name: 'Maxfiy AI sinfi' });
    const outsider = await loginClaims('aziz', 'aziz123');
    await expect(aiSvc.tutor(outsider, klass.id, 'savol')).rejects.toThrow();
  });
});
