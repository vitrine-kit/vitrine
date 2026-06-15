// Построение заказа из корзины и маппинг в Stripe Checkout line items. Денежная/
// заказная логика — в пакете (критично). Stripe SDK сюда НЕ тащим: возвращаем
// нейтральную структуру line items, шаблон передаёт её в stripe.checkout.sessions.
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

/** Нейтральная форма line item Stripe Checkout (price_data — динамические цены). */
export interface StripeCheckoutLineItem {
  quantity: number;
  price_data: {
    currency: string;
    unit_amount: number;
    product_data: { name: string };
  };
}

/** Cart → Stripe Checkout line_items. unit_amount — минимальные единицы (как Money). */
export function cartToStripeLineItems(cart: Cart): StripeCheckoutLineItem[] {
  return cart.lines.map((l) => ({
    quantity: l.quantity,
    price_data: {
      currency: cart.currency.toLowerCase(),
      unit_amount: l.unitPrice,
      product_data: { name: l.title },
    },
  }));
}
