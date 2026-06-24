// Idempotent order creation from a normalized payment event — shared code
// for all webhook routes (checkout-stripe/paddle/yookassa). The provider has already
// verified and normalized the event; here it's only Payload persistence.
// The critical logic (dedup, order snapshot) lives in @vitrine-kit/core (shouldCreateOrder,
// buildOrderFromCart). Next/Payload glue, not typechecked in the monorepo.
import { getPayload } from 'payload';
import config from '@payload-config';
import type { Cart } from '@vitrine-kit/contracts';
import {
  buildOrderFromCart,
  shouldCreateOrder,
  type NormalizedPaymentEvent,
  type PaymentProviderName,
} from '@vitrine-kit/core';

/** Creates an order from the cart on a payment event and marks the cart converted. */
export async function fulfillOrderFromEvent(
  event: NormalizedPaymentEvent,
  providerName: PaymentProviderName,
): Promise<void> {
  if (event.kind !== 'checkout_completed') return;
  const cartId = event.cartId;
  if (!cartId) return;

  const payload = await getPayload({ config });
  const cartDoc = await payload.findByID({ collection: 'carts', id: cartId }).catch(() => null);
  if (!cartDoc) return;

  // Idempotency: the provider retries the webhook — don't create the order twice
  // (the cart is already converted, or an order with this payment reference already exists).
  const prior = event.providerRef
    ? await payload
        .find({ collection: 'orders', where: { paymentRef: { equals: event.providerRef } }, limit: 1 })
        .catch(() => ({ docs: [] as Array<{ paymentRef?: string }> }))
    : { docs: [] as Array<{ paymentRef?: string }> };
  const consumable = shouldCreateOrder({
    cartStatus: (cartDoc as { status?: string }).status,
    providerRef: event.providerRef,
    existingOrderRefs: (prior.docs as Array<{ paymentRef?: string }>).map((d) => d.paymentRef),
  });
  if (!consumable) return;

  const cart: Cart = {
    id: String(cartDoc.id),
    lines: (cartDoc.lines as Cart['lines']) ?? [],
    currency: (cartDoc.currency as string) ?? 'USD',
    subtotal: (cartDoc.subtotal as number) ?? 0,
    discountTotal: cartDoc.discountTotal as number | undefined,
    total: (cartDoc.total as number) ?? 0,
  };
  const order = buildOrderFromCart(cart, { id: cartId, email: event.email });

  await payload.create({
    collection: 'orders',
    data: {
      status: order.status,
      email: order.email,
      currency: order.currency,
      subtotal: order.subtotal,
      total: order.total,
      lines: order.lines,
      createdAt: order.createdAt,
      paymentProvider: providerName,
      paymentRef: event.providerRef,
    },
  });
  await payload.update({
    collection: 'carts',
    id: cartId,
    data: { status: 'converted', paymentRef: event.providerRef },
  });
}
