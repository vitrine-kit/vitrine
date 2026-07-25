'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(): Promise<void> {
    const form = formRef.current;
    if (!form || !token) return;
    setPending(true);
    setError(null);
    const password = String(new FormData(form).get('password') ?? '');
    try {
      const res = await fetch('/api/customers/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          errors?: Array<{ message?: string }>;
          message?: string;
        };
        setError(data.errors?.[0]?.message ?? data.message ?? 'Could not reset password.');
        return;
      }
      router.push('/account/login');
      router.refresh();
    } catch {
      setError('Could not reset password.');
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return <p className="text-muted-fg">Missing reset token. Request a new link from the login page.</p>;
  }

  return (
    <form
      ref={formRef}
      className="vt-reset-password-form flex flex-col gap-gutter"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label className="flex flex-col gap-unit text-sm">
        <span className="text-fg">New password</span>
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
        onClick={() => void submit()}
        disabled={pending}
        className="w-fit rounded-md bg-primary px-gutter py-unit text-primary-fg disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 ring-ring"
      >
        {pending ? 'Saving…' : 'Update password'}
      </button>
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
