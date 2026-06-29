'use server';

import { redirect } from 'next/navigation';
import { findUserByCredentials } from './demo-data';
import { clearSession, setSession } from './session';

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get('username') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!username || !password) {
    return { error: 'Login va parolni kiriting.' };
  }

  const user = findUserByCredentials(username, password);
  if (!user) {
    return { error: 'Login yoki parol noto‘g‘ri.' };
  }

  await setSession(user.id);
  redirect('/classroom');
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect('/login');
}
