// Итоги корзины. Хостит слот cart.summary (туда checkout-stripe монтирует кнопку
// оформления) и передаёт ему cartId.
import type { Cart } from '@maks417/contracts';
import { Slot } from '@maks417/core/react';
import { formatMoney } from '../../lib/cart/data.js';

export interface CartSummaryProps {
  cart: Cart;
}

export function CartSummary({ cart }: CartSummaryProps) {
  return (
    <aside className="vt-cart-summary flex flex-col gap-unit rounded-md border border-border p-gutter">
      <div className="flex justify-between text-muted-fg">
        <span>Подытог</span>
        <span>{formatMoney(cart.subtotal, cart.currency)}</span>
      </div>
      {cart.discountTotal ? (
        <div className="flex justify-between text-muted-fg">
          <span>Скидка</span>
          <span>−{formatMoney(cart.discountTotal, cart.currency)}</span>
        </div>
      ) : null}
      <div className="flex justify-between text-fg">
        <span>Итого</span>
        <span className="text-price">{formatMoney(cart.total, cart.currency)}</span>
      </div>
      <Slot name="cart.summary" cartId={cart.id} />
    </aside>
  );
}
