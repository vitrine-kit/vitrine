'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout(): Promise<void> {
    setPending(true);
    try {
      await fetch('/api/customers/logout', { method: 'POST' });
      router.push('/account');
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className="w-fit text-fg underline underline-offset-2 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 ring-ring"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
