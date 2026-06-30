'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { findUserByCredentials } from '@/lib/demo-data';
import { setSession } from '@/lib/client-session';
import { apiEnabled, getApi, userStore } from '@/lib/api';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    const username = String(form.get('username') ?? '');
    const password = String(form.get('password') ?? '');

    if (!username || !password) {
      setError('Login va parolni kiriting.');
      return;
    }

    if (apiEnabled) {
      setBusy(true);
      try {
        const result = await getApi().auth.login(username, password);
        userStore.set(result.user);
        startTransition(() => router.push('/classroom'));
      } catch {
        setError('Login yoki parol noto‘g‘ri.');
      } finally {
        setBusy(false);
      }
      return;
    }

    // Demo (mock) rejim
    const user = findUserByCredentials(username, password);
    if (!user) {
      setError('Login yoki parol noto‘g‘ri.');
      return;
    }
    setSession(user.id);
    startTransition(() => router.push('/classroom'));
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Login">
        <input
          name="username"
          autoComplete="username"
          autoFocus
          placeholder="masalan: aziz"
          className="input"
        />
      </Field>

      <Field label="Parol">
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className="input"
        />
      </Field>

      {error && (
        <p
          role="alert"
          className="animate-fade-rise rounded-[var(--radius-sm)] px-3 py-2 text-sm"
          style={{
            background: 'color-mix(in srgb, var(--danger) 12%, transparent)',
            color: 'var(--danger)',
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || busy}
        className="ring-brand mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] font-semibold shadow-soft-md transition active:scale-[.99] disabled:opacity-70"
        style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
      >
        {pending || busy ? (
          <>
            <Spinner /> Kirilmoqda…
          </>
        ) : (
          'Kirish'
        )}
      </button>

      <style>{`
        .input {
          width: 100%;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          background: var(--surface-2);
          color: var(--text);
          padding: 0.7rem 0.85rem;
          font-size: 0.95rem;
          transition: box-shadow .15s, border-color .15s;
        }
        .input::placeholder { color: var(--text-muted); opacity: .7; }
        .input:focus-visible { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--ring); }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-muted text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
