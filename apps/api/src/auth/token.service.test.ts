import 'reflect-metadata';
import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import type { Database } from '@modern-edu/db';
import type { AccessTokenClaims } from '@modern-edu/contracts';
import { TokenService } from './token.service.js';
import type { AppEnv } from '../config/env.js';

const env: AppEnv = {
  NODE_ENV: 'test',
  PORT: 0,
  DATABASE_URL: 'postgres://x',
  JWT_ACCESS_SECRET: 'test-access-secret-0123456789',
  JWT_REFRESH_SECRET: 'test-refresh-secret-0123456789',
  ACCESS_TOKEN_TTL: '15m',
  REFRESH_TOKEN_TTL_DAYS: 30,
  CORS_ORIGIN: '*',
};

const svc = new TokenService({} as unknown as Database, env);

const claims: AccessTokenClaims = {
  sub: '11111111-1111-1111-1111-111111111111',
  orgId: '22222222-2222-2222-2222-222222222222',
  role: 'admin',
  sid: '33333333-3333-3333-3333-333333333333',
  mustChangePassword: false,
};

describe('TokenService.verifyAccess', () => {
  it('to‘g‘ri imzolangan tokenni tasdiqlaydi', () => {
    const token = jwt.sign(claims, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
    const decoded = svc.verifyAccess(token);
    expect(decoded.sub).toBe(claims.sub);
    expect(decoded.role).toBe('admin');
  });

  it('yaroqsiz tokenni rad etadi', () => {
    expect(() => svc.verifyAccess('not-a-token')).toThrow();
  });

  it('boshqa sir bilan imzolangan tokenni rad etadi', () => {
    const token = jwt.sign(claims, 'boshqa-sir', { expiresIn: '15m' });
    expect(() => svc.verifyAccess(token)).toThrow();
  });
});
