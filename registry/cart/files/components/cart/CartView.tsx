// Содержимое корзины — презентационное. Хостит слоты cart.items-bottom / cart.below.
import type { Cart } from '@maks417/contracts';
import { Slot } from '@maks417/core/react';
import { CartLineItem } from './CartLineItem.js';
import { CartSummary } from './CartSummary.js';

export interface CartViewProps {
  cart: Cart;
}

export function CartView({ cart }: CartViewProps) {
  if (cart.lines.length === 0) {
    return <p className="text-muted-fg">Корзина пуста.</p>;
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
