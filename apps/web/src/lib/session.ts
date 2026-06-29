/**
 * Soddalashtirilgan sessiya (preview).
 * Production'da bu httpOnly JWT + aylanuvchi refresh token bilan almashtiriladi
 * (docs/02 §4). Hozircha faqat foydalanuvchi id'sini cookie'da saqlaymiz.
 */
import { cookies } from 'next/headers';
import { findUserById, type DemoUser } from './demo-data';

const COOKIE = 'medu_session';

export async function setSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, userId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getCurrentUser(): Promise<DemoUser | null> {
  const store = await cookies();
  const id = store.get(COOKIE)?.value;
  if (!id) return null;
  return findUserById(id) ?? null;
}
