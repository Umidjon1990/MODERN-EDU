// Parol hashlash (Argon2id). Seed va API (autentifikatsiya) shu yerdan foydalanadi.
import { hash, verify } from '@node-rs/argon2';

const ARGON_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON_OPTS);
}

export function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  return verify(hashed, plain, ARGON_OPTS);
}
