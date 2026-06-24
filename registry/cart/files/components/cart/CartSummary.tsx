// Cart totals. Hosts the cart.summary slot (where checkout-stripe mounts the checkout
// button) and passes it cartId.
import type { Cart } from '@vitrine-kit/contracts';
import { Slot } from '@vitrine-kit/core/react';
import { formatMoney } from '../../lib/cart/data.js';

export interface CartSummaryProps {
  cart: Cart;
}

export function CartSummary({ cart }: CartSummaryProps) {
  return (
    <aside className="vt-cart-summary flex flex-col gap-unit rounded-md border border-border p-gutter">
      <div className="flex justify-between text-muted-fg">
        <span>Subtotal</span>
        <span>{formatMoney(cart.subtotal, cart.currency)}</span>
      </div>
      {cart.discountTotal ? (
        <div className="flex justify-between text-muted-fg">
          <span>Discount</span>
          <span>−{formatMoney(cart.discountTotal, cart.currency)}</span>
        </div>
      ) : null}
      <div className="flex justify-between text-fg">
        <span>Total</span>
        <span className="text-price">{formatMoney(cart.total, cart.currency)}</span>
      </div>
      <Slot name="cart.summary" cartId={cart.id} />
    </aside>
  );
}
