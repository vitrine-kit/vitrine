// Checkout button — client component. Mounted into the cart.summary slot.
// POST /api/checkout creates a payment session with the active provider and returns the
// redirect URL — the component doesn't know which provider is configured (Stripe/Paddle/YooKassa).
'use client';
import { useState } from 'react';

export function CheckoutButton() {
  const [pending, setPending] = useState(false);

  async function checkout(): Promise<void> {
    setPending(true);
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) location.assign(data.url);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={checkout}
      disabled={pending}
      className="vt-checkout-button rounded-md bg-primary px-gutter py-unit text-primary-fg transition hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 ring-ring"
    >
      {pending ? 'Redirecting to payment…' : 'Checkout'}
    </button>
  );
}
