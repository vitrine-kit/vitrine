// Построение заказа из корзины. Денежная/заказная логика — в пакете (критично).
// Маппинг в формат конкретного платёжного провайдера живёт в самой фиче
// checkout-<provider> (вместе с её SDK), а не здесь.
import type { Cart, Order, OrderLine, OrderStatus } from '@maks417/contracts';

export interface BuildOrderOptions {
  id: string;
  status?: OrderStatus;
  email?: string;
  number?: string;
  /** ISO-8601; по умолчанию — сейчас. */
  createdAt?: string;
}

/** Снимок корзины в заказ (после оплаты). Итоги берём из корзины — не пересчитываем. */
export function buildOrderFromCart(cart: Cart, opts: BuildOrderOptions): Order {
  const lines: OrderLine[] = cart.lines.map((l) => ({
    variantId: l.variantId,
    productId: l.productId,
    title: l.title,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    lineTotal: l.lineTotal,
  }));
  return {
    id: opts.id,
    number: opts.number,
    status: opts.status ?? 'paid',
    lines,
    currency: cart.currency,
    subtotal: cart.subtotal,
    discountTotal: cart.discountTotal,
    total: cart.total,
    email: opts.email,
    createdAt: opts.createdAt ?? new Date().toISOString(),
  };
}
