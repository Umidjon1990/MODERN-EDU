import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { LoginForm } from './login-form';
import { BrandMark } from '@/components/brand';
import { ThemeToggle } from '@/components/theme-toggle';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect('/classroom');

  return (
    <main className="bg-app relative min-h-dvh">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
        <div className="animate-fade-rise">
          <div className="mb-8 flex flex-col items-center text-center">
            <BrandMark size={56} />
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Modern Edu</h1>
            <p className="text-muted mt-1 text-sm">Sinfxonangizga xush kelibsiz</p>
          </div>

          <div
            className="surface rounded-[var(--radius-xl)] border p-6 shadow-soft-lg sm:p-7"
            style={{ borderColor: 'var(--border)' }}
          >
            <LoginForm />
          </div>

          <DemoHint />

          <p className="text-muted mt-8 text-center text-xs">
            Maxfiy platforma · Hisoblar faqat o‘qituvchi/admin tomonidan yaratiladi
          </p>
        </div>
      </div>
    </main>
  );
}

function DemoHint() {
  return (
    <div
      className="mt-4 rounded-[var(--radius-lg)] border p-4 text-xs"
      style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
    >
      <p className="text-muted mb-2 font-medium">Sinab ko‘rish uchun namuna hisoblar:</p>
      <ul className="text-muted grid gap-1">
        <li>
          👩‍🏫 O‘qituvchi — <code className="font-semibold">teacher</code> /{' '}
          <code className="font-semibold">teacher123</code>
        </li>
        <li>
          🧑‍🎓 O‘quvchi — <code className="font-semibold">aziz</code> /{' '}
          <code className="font-semibold">aziz123</code>
        </li>
        <li>
          🧑‍🎓 O‘quvchi — <code className="font-semibold">malika</code> /{' '}
          <code className="font-semibold">malika123</code>
        </li>
      </ul>
    </div>
  );
}
