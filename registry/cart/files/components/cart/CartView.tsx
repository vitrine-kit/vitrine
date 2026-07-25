// Cart contents — presentational. Hosts the cart.items-bottom / cart.below slots.
'use client';

import type { Cart } from '@vitrine-kit/contracts';
import { Slot } from '@vitrine-kit/core/react';
import { useChromeLabel } from '@/lib/i18n/useChromeLabel';
import { CartLineItem } from './CartLineItem.js';
import { CartSummary } from './CartSummary.js';

export interface CartViewProps {
  cart: Cart;
}

export function CartView({ cart }: CartViewProps) {
  const continueShopping = useChromeLabel('continueShopping');
  const addToCart = useChromeLabel('addToCart');

  if (cart.lines.length === 0) {
    return (
      <div className="vt-cart-empty flex flex-col gap-gutter">
        <p className="text-muted-fg">Your cart is empty.</p>
        <p className="text-sm text-muted-fg">
          Browse the catalog, open a product, then use <span className="text-fg">{addToCart}</span>{' '}
          to start checkout.
        </p>
        <a
          href="/"
          className="w-fit rounded-md border border-border px-gutter py-unit text-fg transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 ring-ring"
        >
          {continueShopping}
        </a>
      </div>
    );
  }
  return (
    <div className="vt-cart grid gap-section md:grid-cols-[2fr_1fr]">
      <div>
        <ul role="list">
          {cart.lines.map((line) => (
            <CartLineItem key={line.id} line={line} currency={cart.currency} />
          ))}
        </ul>
        <Slot name="cart.items-bottom" />
      </div>
      <div className="flex flex-col gap-gutter">
        <CartSummary cart={cart} />
        <Slot name="cart.below" />
      </div>
    </div>
  );
}
