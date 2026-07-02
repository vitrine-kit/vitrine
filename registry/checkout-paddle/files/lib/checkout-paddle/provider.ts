// PaymentProvider over Paddle Billing. The SDK lives here (in the feature), not in the core.
// createCheckout creates a transaction with non-catalog line items (prices set on the fly
// from the cart) and custom_data.cartId → returns the hosted checkout URL. verifyWebhook
// verifies the Paddle-Signature (HMAC) and normalizes the event.
//
// Paddle expects amounts as a string in the currency's minor units (like our Money), so
// we pass String(unitPrice) as-is. For hosted checkout, the Paddle dashboard needs a
// default payment link OR set PADDLE_CHECKOUT_URL (override).
import { Environment, Paddle, type EventEntity } from '@paddle/paddle-node-sdk';
import type { CreateCheckoutArgs, NormalizedPaymentEvent, PaymentProvider, PaymentWebhookRequest } from '@vitrine-kit/core';

/** Required env, read at call time — `next build` must not need secrets. */
function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`[vitrine] ${key} is not set — add it to .env (see .env.example)`);
  return value;
}

function client(): Paddle {
  return new Paddle(requiredEnv('PADDLE_API_KEY'), {
    environment:
      process.env.PADDLE_ENVIRONMENT === 'production' ? Environment.production : Environment.sandbox,
  });
}

export const paddleProvider: PaymentProvider = {
  name: 'paddle',

  async createCheckout(args: CreateCheckoutArgs): Promise<{ redirectUrl: string }> {
    const { cart, baseUrl, cancelPath = '/cart' } = args;
    const paddle = client();
    const txn = await paddle.transactions.create({
      items: cart.lines.map((l) => ({
        quantity: l.quantity,
        price: {
          description: l.title,
          name: l.title,
          unitPrice: { amount: String(l.unitPrice), currencyCode: cart.currency },
          product: { name: l.title, taxCategory: 'standard' },
        },
      })),
      customData: { cartId: cart.id },
      ...(process.env.PADDLE_CHECKOUT_URL ? { checkout: { url: process.env.PADDLE_CHECKOUT_URL } } : {}),
    });
    return { redirectUrl: txn.checkout?.url ?? `${baseUrl}${cancelPath}` };
  },

  async verifyWebhook(req: PaymentWebhookRequest): Promise<NormalizedPaymentEvent> {
    const paddle = client();
    const secret = requiredEnv('PADDLE_WEBHOOK_SECRET');
    const signature = req.headers['paddle-signature'] ?? '';
    // Throws on an invalid signature — handlePaymentWebhook returns a 400.
    const event = (await paddle.webhooks.unmarshal(req.rawBody, secret, signature)) as EventEntity | null;
    if (!event) return { kind: 'unknown', raw: req.rawBody };

    if (event.eventType === 'transaction.completed' || event.eventType === 'transaction.paid') {
      const data = event.data as {
        id?: string;
        customData?: { cartId?: string } | null;
        customerId?: string | null;
      };
      const cartId = (data.customData ?? undefined)?.cartId;
      // The notification carries no email — best-effort lookup on the Customer entity.
      // A lookup failure must not fail fulfillment: email is optional on the event.
      let email: string | undefined;
      if (data.customerId) {
        try {
          email = (await paddle.customers.get(data.customerId)).email ?? undefined;
        } catch {
          // keep email undefined — the order is still created
        }
      }
      return { kind: 'checkout_completed', cartId, providerRef: data.id, email, raw: event };
    }
    if (event.eventType === 'transaction.payment_failed') {
      return { kind: 'payment_failed', raw: event };
    }
    return { kind: 'unknown', raw: event };
  },
};
