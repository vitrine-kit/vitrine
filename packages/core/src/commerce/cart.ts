// Cart arithmetic (the Cart contract). The critical money logic lives in the
// package, not the copy-in registry: a bug in totals = an incident for every client.
// Pure functions (no I/O) — the template's CommerceBackend implementation delegates to them,
// keeping only persistence. Money is an integer in minor units (e.g. cents).
import type { Cart, CartLine, CurrencyCode, Money } from '@vitrine-kit/contracts';

export function computeLineTotal(unitPrice: Money, quantity: number): Money {
  return unitPrice * quantity;
}

/** An empty cart. */
export function emptyCart(id: string, currency: CurrencyCode): Cart {
  return { id, lines: [], currency, subtotal: 0, total: 0 };
}

/** Recomputes each line's lineTotal and the totals (subtotal/total incl. discount). */
export function recalcCart(cart: Cart): Cart {
  const lines = cart.lines.map((l) => ({ ...l, lineTotal: computeLineTotal(l.unitPrice, l.quantity) }));
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const discountTotal = cart.discountTotal ?? 0;
  const total = Math.max(0, subtotal - discountTotal);
  return { ...cart, lines, subtotal, total };
}

export interface NewLineInput {
  id: string;
  variantId: string;
  productId: string;
  title: string;
  unitPrice: Money;
  quantity: number;
  image?: string;
}

/** Adds a line; if the variant is already in the cart, increases its quantity. */
export function addCartLine(cart: Cart, input: NewLineInput): Cart {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new Error(`[vitrine] invalid line quantity: ${input.quantity} (must be an integer > 0)`);
  }
  const exists = cart.lines.some((l) => l.variantId === input.variantId);
  const lines: CartLine[] = exists
    ? cart.lines.map((l) =>
        l.variantId === input.variantId ? { ...l, quantity: l.quantity + input.quantity } : l,
      )
    : [
        ...cart.lines,
        {
          id: input.id,
          variantId: input.variantId,
          productId: input.productId,
          title: input.title,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          lineTotal: computeLineTotal(input.unitPrice, input.quantity),
          image: input.image,
        },
      ];
  return recalcCart({ ...cart, lines });
}

/** Changes a line's quantity; quantity ≤ 0 removes the line. */
export function setCartLineQty(cart: Cart, lineId: string, quantity: number): Cart {
  if (!Number.isInteger(quantity)) {
    throw new Error(`[vitrine] invalid quantity: ${quantity} (must be an integer)`);
  }
  if (quantity <= 0) return removeCartLine(cart, lineId);
  return recalcCart({
    ...cart,
    lines: cart.lines.map((l) => (l.id === lineId ? { ...l, quantity } : l)),
  });
}

export function removeCartLine(cart: Cart, lineId: string): Cart {
  return recalcCart({ ...cart, lines: cart.lines.filter((l) => l.id !== lineId) });
}

/** Total number of units in the cart (for the header indicator). */
export function cartItemCount(cart: Cart): number {
  return cart.lines.reduce((n, l) => n + l.quantity, 0);
}
