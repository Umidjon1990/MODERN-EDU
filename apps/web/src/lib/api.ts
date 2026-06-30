'use client';

import { ApiClient } from '@modern-edu/sdk';
import type { PublicUser } from '@modern-edu/contracts';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/** API rejimi yoqilganmi (Railway). Aks holda demo (mock) rejim ishlaydi. */
export const apiEnabled = Boolean(API_URL);

const AT_KEY = 'medu_at';
const USER_KEY = 'medu_user';

export const tokenStore = {
  get: (): string | null => {
    try {
      return localStorage.getItem(AT_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(AT_KEY, token);
    } catch {
      /* yo'q */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(AT_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      /* yo'q */
    }
  },
};

export const userStore = {
  get: (): PublicUser | null => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as PublicUser) : null;
    } catch {
      return null;
    }
  },
  set: (user: PublicUser) => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* yo'q */
    }
  },
};

let client: ApiClient | null = null;

export function getApi(): ApiClient {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL aniqlanmagan (mock rejim)');
  if (!client) {
    client = new ApiClient({
      baseUrl: API_URL,
      getAccessToken: () => tokenStore.get(),
      onTokens: (t) => tokenStore.set(t.accessToken),
      onUnauthorized: () => {
        tokenStore.clear();
        if (typeof window !== 'undefined') window.location.assign('/login');
      },
    });
  }
  return client;
}
