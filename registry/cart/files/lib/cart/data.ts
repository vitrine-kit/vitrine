// Cart access via the CommerceBackend contract + price formatting.
// The cart arithmetic lives in @vitrine-kit/core (critical logic); a ready Cart arrives here.
import type { Cart, CommerceBackend } from '@vitrine-kit/contracts';

export async function loadCart(commerce: CommerceBackend, cartId: string): Promise<Cart | null> {
  return commerce.getCart(cartId);
}

/** Money — minor units (e.g. cents); divide by 100 for 2-decimal currencies. */
export function formatMoney(amount: number, currency: string, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount / 100);
}
