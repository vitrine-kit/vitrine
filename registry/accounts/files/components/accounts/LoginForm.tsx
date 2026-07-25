'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signIn(): Promise<void> {
    const form = formRef.current;
    if (!form) return;
    setPending(true);
    setError(null);
    const fd = new FormData(form);
    const email = String(fd.get('email') ?? '');
    const password = String(fd.get('password') ?? '');
    try {
      const res = await fetch('/api/customers/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { errors?: Array<{ message?: string }> };
        setError(data.errors?.[0]?.message ?? 'Could not sign in.');
        return;
      }
      router.push('/account/orders');
      router.refresh();
    } catch {
      setError('Could not sign in.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      ref={formRef}
      className="vt-login-form flex flex-col gap-gutter"
      onSubmit={(e) => {
        e.preventDefault();
        void signIn();
      }}
    >
      <label className="flex flex-col gap-unit text-sm">
        <span className="text-fg">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="rounded-md border border-input bg-surface px-gutter py-unit text-surface-fg focus-visible:outline-none focus-visible:ring-2 ring-ring"
        />
      </label>
      <label className="flex flex-col gap-unit text-sm">
        <span className="text-fg">Password</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-input bg-surface px-gutter py-unit text-surface-fg focus-visible:outline-none focus-visible:ring-2 ring-ring"
        />
      </label>
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={pending}
        className="w-fit rounded-md bg-primary px-gutter py-unit text-primary-fg disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 ring-ring"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
