'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export function RegisterForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createAccount(): Promise<void> {
    const form = formRef.current;
    if (!form) return;
    setPending(true);
    setError(null);
    const fd = new FormData(form);
    const name = String(fd.get('name') ?? '').trim();
    const email = String(fd.get('email') ?? '');
    const password = String(fd.get('password') ?? '');
    try {
      const create = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, name: name || undefined }),
      });
      if (!create.ok) {
        const data = (await create.json().catch(() => ({}))) as {
          errors?: Array<{ message?: string }>;
          message?: string;
        };
        setError(data.errors?.[0]?.message ?? data.message ?? 'Could not create account.');
        return;
      }
      const login = await fetch('/api/customers/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!login.ok) {
        setError('Account created — please sign in.');
        router.push('/account/login');
        return;
      }
      router.push('/account/orders');
      router.refresh();
    } catch {
      setError('Could not create account.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      ref={formRef}
      className="vt-register-form flex flex-col gap-gutter"
      onSubmit={(e) => {
        e.preventDefault();
        void createAccount();
      }}
    >
      <label className="flex flex-col gap-unit text-sm">
        <span className="text-fg">Name</span>
        <input
          type="text"
          name="name"
          autoComplete="name"
          className="rounded-md border border-input bg-surface px-gutter py-unit text-surface-fg focus-visible:outline-none focus-visible:ring-2 ring-ring"
        />
      </label>
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
          minLength={8}
          autoComplete="new-password"
          className="rounded-md border border-input bg-surface px-gutter py-unit text-surface-fg focus-visible:outline-none focus-visible:ring-2 ring-ring"
        />
      </label>
      <button
        type="button"
        onClick={() => void createAccount()}
        disabled={pending}
        className="w-fit rounded-md bg-primary px-gutter py-unit text-primary-fg disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 ring-ring"
      >
        {pending ? 'Creating…' : 'Create account'}
      </button>
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
