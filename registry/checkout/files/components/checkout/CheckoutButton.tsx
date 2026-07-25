// Checkout button — client component. Mounted into the cart.summary slot.
// POST /api/checkout creates a payment session with the active provider and returns the
// redirect URL — the component doesn't know which provider is configured (Stripe/Paddle/YooKassa).
'use client';
import { useState } from 'react';
import { useChromeLabel } from '@/lib/i18n/useChromeLabel';

export function CheckoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkout = useChromeLabel('checkout');

  async function startCheckout(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Checkout is unavailable — try again later.');
        return;
      }
      location.assign(data.url);
    } catch {
      setError('Checkout is unavailable — try again later.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={startCheckout}
        disabled={pending}
        className="vt-checkout-button rounded-md bg-primary px-gutter py-unit text-primary-fg transition hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 ring-ring"
      >
        {pending ? 'Redirecting to payment…' : checkout}
      </button>
      {error ? (
        <p role="alert" className="vt-checkout-error text-danger">
          {error}
        </p>
      ) : null}
    </>
  );
}
