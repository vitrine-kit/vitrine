// Idempotency of order creation from a webhook. Providers retry event delivery
// (Stripe/Paddle/YooKassa) — without protection this creates duplicate orders.
// The solution is a pure function in the package (critical logic: a bug = double orders for every
// client); the copy-in route just supplies the state from the DB.

export interface OrderCreationGuard {
  /** Cart status (the Payload `carts` map): 'converted' = already paid. */
  cartStatus?: string | null;
  /** Payment reference of the current event (session/transaction/payment id). */
  providerRef?: string;
  /** paymentRef of existing orders (usually the result of a targeted lookup). */
  existingOrderRefs?: ReadonlyArray<string | undefined>;
}

/**
 * Whether to create an order for this event. false if the cart is already converted OR
 * an order already exists for this payment reference (redelivery/retry of the webhook).
 */
export function shouldCreateOrder(guard: OrderCreationGuard): boolean {
  if (guard.cartStatus === 'converted') return false;
  if (guard.providerRef && (guard.existingOrderRefs ?? []).includes(guard.providerRef)) {
    return false;
  }
  return true;
}
