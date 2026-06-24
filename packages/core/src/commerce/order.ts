// Building an order from the cart. The money/order logic is in the package (critical).
// Mapping into a specific payment provider's format lives in the
// checkout-<provider> feature itself (with its SDK), not here.
import type { Cart, Order, OrderLine, OrderStatus } from '@vitrine-kit/contracts';

export interface BuildOrderOptions {
  id: string;
  status?: OrderStatus;
  email?: string;
  number?: string;
  /** ISO-8601; defaults to now. */
  createdAt?: string;
}

/** Snapshots the cart into an order (after payment). Totals come from the cart — not recomputed. */
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
