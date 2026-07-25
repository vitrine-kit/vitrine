'use client';

import { useRef, useState } from 'react';

export function ForgotPasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(): Promise<void> {
    const form = formRef.current;
    if (!form) return;
    setPending(true);
    setError(null);
    const email = String(new FormData(form).get('email') ?? '');
    try {
      const res = await fetch('/api/customers/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Always show success copy — avoid email enumeration.
      if (!res.ok && res.status !== 200) {
        const data = (await res.json().catch(() => ({}))) as { errors?: Array<{ message?: string }> };
        // Payload may still 200 for unknown emails; only surface hard failures.
        if (res.status >= 500) {
          setError(data.errors?.[0]?.message ?? 'Could not send reset email.');
          return;
        }
      }
      setDone(true);
    } catch {
      setError('Could not send reset email.');
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-unit text-muted-fg" role="status">
        <p>
          If an account exists for that email, a reset link is on its way. Check your inbox.
        </p>
        <p className="text-sm">
          Without SMTP, the link is printed in the server console /{' '}
          <code className="text-fg">docker compose logs</code> (set{' '}
          <code className="text-fg">EMAIL_FROM</code>; add <code className="text-fg">SMTP_HOST</code>{' '}
          for real delivery).
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      className="vt-forgot-password-form flex flex-col gap-gutter"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
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
      <button
        type="button"
        onClick={() => void submit()}
        disabled={pending}
        className="w-fit rounded-md bg-primary px-gutter py-unit text-primary-fg disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 ring-ring"
      >
        {pending ? 'Sending…' : 'Send reset link'}
      </button>
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
