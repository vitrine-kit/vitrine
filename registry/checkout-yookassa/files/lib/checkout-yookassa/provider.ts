// PaymentProvider over YooKassa (yookassa.ru) — Russian acquiring: cards, SBP, wallets.
// No SDK needed: REST /v3/payments + Basic auth (shopId:secretKey). The core doesn't pull in
// payment SDKs. createCheckout creates a payment with confirmation.redirect → confirmation_url.
//
// IMPORTANT: YooKassa notifications are NOT signed. verifyWebhook confirms authenticity
// with a follow-up API request (GET /v3/payments/{id}) and trusts only status=succeeded.
//
// YooKassa expects the amount as a decimal string ("1990.00"); our Money is in minor units,
// so we divide by 100 (RUB and most currencies have 2 decimal places).
import { randomUUID } from 'node:crypto';
import type { CreateCheckoutArgs, NormalizedPaymentEvent, PaymentProvider, PaymentWebhookRequest } from '@vitrine-kit/core';

const API = 'https://api.yookassa.ru/v3/payments';
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP']);

/** Minor units → currency decimal string ("199000" RUB → "1990.00"). */
function minorToDecimalString(amount: number, currency: string): string {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? String(amount) : (amount / 100).toFixed(2);
}

/** Required env, read at call time — `next build` must not need secrets. */
function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`[vitrine] ${key} is not set — add it to .env (see .env.example)`);
  return value;
}

function authHeader(): string {
  const shopId = requiredEnv('YOOKASSA_SHOP_ID');
  const secret = requiredEnv('YOOKASSA_SECRET_KEY');
  return `Basic ${Buffer.from(`${shopId}:${secret}`).toString('base64')}`;
}

export const yookassaProvider: PaymentProvider = {
  name: 'yookassa',

  async createCheckout(args: CreateCheckoutArgs): Promise<{ redirectUrl: string }> {
    const { cart, baseUrl, successPath = '/order/success', cancelPath = '/cart' } = args;
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Idempotence-Key': randomUUID(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: {
          value: minorToDecimalString(cart.total, cart.currency),
          currency: cart.currency.toUpperCase(),
        },
        capture: true,
        confirmation: { type: 'redirect', return_url: `${baseUrl}${successPath}` },
        description: `Order (cart ${cart.id})`,
        metadata: { cartId: cart.id },
      }),
    });
    if (!res.ok) throw new Error(`[vitrine] YooKassa: ${res.status} ${await res.text()}`);
    const payment = (await res.json()) as { confirmation?: { confirmation_url?: string } };
    return { redirectUrl: payment.confirmation?.confirmation_url ?? `${baseUrl}${cancelPath}` };
  },

  async verifyWebhook(req: PaymentWebhookRequest): Promise<NormalizedPaymentEvent> {
    const body = JSON.parse(req.rawBody) as { event?: string; object?: { id?: string } };
    const paymentId = body.object?.id;
    if (!paymentId) return { kind: 'unknown', raw: body };

    // The notification is unsigned — re-check the payment via the API. 404 = no such
    // payment for this shop (forged/foreign notification) → ack as 'unknown'; any other
    // failure is transient → throw (a non-200 response makes YooKassa redeliver later).
    const res = await fetch(`${API}/${paymentId}`, { headers: { Authorization: authHeader() } });
    if (res.status === 404) return { kind: 'unknown', raw: body };
    if (!res.ok) throw new Error(`[vitrine] YooKassa verify: ${res.status} (transient — expecting a redelivery)`);
    const payment = (await res.json()) as {
      id?: string;
      status?: string;
      metadata?: { cartId?: string };
    };

    if (payment.status === 'succeeded') {
      return {
        kind: 'checkout_completed',
        cartId: payment.metadata?.cartId,
        providerRef: payment.id,
        raw: payment,
      };
    }
    if (payment.status === 'canceled') {
      return { kind: 'payment_failed', raw: payment };
    }
    return { kind: 'unknown', raw: payment };
  },
};
