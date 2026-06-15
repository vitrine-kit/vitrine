// Кнопка «В корзину» — клиентский компонент. Монтируется в слот product.purchase
// (ProductView передаёт product). Мутация — через POST /api/cart (роут фичи).
'use client';
import { useState } from 'react';
import type { Product } from '@maks417/contracts';

export interface AddToCartProps {
  product: Product;
}

export function AddToCart({ product }: AddToCartProps) {
  const [pending, setPending] = useState(false);
  const variantId = product.variants[0]?.id;

  async function add(): Promise<void> {
    if (!variantId) return;
    setPending(true);
    try {
      await fetch('/api/cart', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ variantId, quantity: 1 }),
      });
      location.assign('/cart');
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={add}
      disabled={pending || !variantId}
      className="vt-add-to-cart rounded-md bg-primary px-gutter py-unit text-primary-fg transition hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 ring-ring"
    >
      {pending ? 'Добавляем…' : 'В корзину'}
    </button>
  );
}
