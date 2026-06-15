// Stripe webhook: проверка подписи (Stripe SDK) → @maks417/core handleStripeWebhook
// → на checkout.session.completed создаём заказ из корзины (buildOrderFromCart,
// критлогика в пакете) и помечаем корзину converted. Next-glue, не типизируется.
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getPayload } from 'payload';
import config from '@payload-config';
import type { Cart } from '@maks417/contracts';
import { buildOrderFromCart, handleStripeWebhook, shouldCreateOrder, type StripeEventLike } from '@maks417/core';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '');
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

  try {
    const result = await handleStripeWebhook({
      payload: body,
      signature,
      verify: (p, s) => stripe.webhooks.constructEvent(p, s, secret) as unknown as StripeEventLike,
      handlers: {
        onCheckoutCompleted: async (event) => {
          const session = event.data.object as {
            id?: string;
            metadata?: { cartId?: string };
            customer_details?: { email?: string };
          };
          const cartId = session.metadata?.cartId;
          if (!cartId) return;

          const payload = await getPayload({ config });
          const cartDoc = await payload.findByID({ collection: 'carts', id: cartId }).catch(() => null);
          if (!cartDoc) return;

          // Идемпотентность: Stripe ретраит webhook — не создаём заказ повторно
          // (корзина уже converted или заказ по этой сессии уже есть).
          const prior = session.id
            ? await payload
                .find({ collection: 'orders', where: { stripeSessionId: { equals: session.id } }, limit: 1 })
                .catch(() => ({ docs: [] as Array<{ stripeSessionId?: string }> }))
            : { docs: [] as Array<{ stripeSessionId?: string }> };
          const consumable = shouldCreateOrder({
            cartStatus: (cartDoc as { status?: string }).status,
            sessionId: session.id,
            existingOrderSessionIds: (prior.docs as Array<{ stripeSessionId?: string }>).map(
              (d) => d.stripeSessionId,
            ),
          });
          if (!consumable) return;

          const cart: Cart = {
            id: String(cartDoc.id),
            lines: (cartDoc.lines as Cart['lines']) ?? [],
            currency: (cartDoc.currency as string) ?? 'RUB',
            subtotal: (cartDoc.subtotal as number) ?? 0,
            discountTotal: cartDoc.discountTotal as number | undefined,
            total: (cartDoc.total as number) ?? 0,
          };
          const order = buildOrderFromCart(cart, { id: cartId, email: session.customer_details?.email });

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
              stripeSessionId: session.id,
            },
          });
          await payload.update({
            collection: 'carts',
            id: cartId,
            data: { status: 'converted', stripeSessionId: session.id },
          });
        },
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
