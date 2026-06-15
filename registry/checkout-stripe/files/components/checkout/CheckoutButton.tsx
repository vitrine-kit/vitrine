// Кнопка оформления заказа — клиентский компонент. Монтируется в слот cart.summary.
// POST /api/checkout создаёт Stripe Checkout-сессию и возвращает URL редиректа.
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
      {pending ? 'Переходим к оплате…' : 'Оформить заказ'}
    </button>
  );
}
