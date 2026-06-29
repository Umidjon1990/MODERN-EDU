'use client';

/**
 * Client-side sessiya (statik preview / GitHub Pages uchun).
 * localStorage'da faqat foydalanuvchi id'sini saqlaydi.
 *
 * MUHIM: bu xavfsiz autentifikatsiya EMAS — faqat demo navigatsiyasi uchun.
 * Production'da server tomonidagi httpOnly JWT + a'zolik tekshiruvi ishlatiladi
 * (docs/02 §4, 1–2-bosqichlar).
 */
const KEY = 'medu_session';

export function setSession(userId: string): void {
  try {
    localStorage.setItem(KEY, userId);
  } catch {
    // localStorage mavjud bo'lmasligi mumkin
  }
}

export function getSession(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // e'tiborsiz
  }
}
