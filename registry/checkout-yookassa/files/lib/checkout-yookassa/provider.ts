// PaymentProvider поверх ЮKassa (yookassa.ru) — эквайринг РФ: карты, СБП, кошельки.
// SDK не нужен: REST /v3/payments + Basic-auth (shopId:secretKey). Ядро платёжных SDK
// не тащит. createCheckout создаёт платёж с confirmation.redirect → confirmation_url.
//
// ВАЖНО: ЮKassa-уведомления НЕ подписаны. verifyWebhook подтверждает подлинность
// повторным запросом к API (GET /v3/payments/{id}) и доверяет только status=succeeded.
//
// ЮKassa ждёт сумму десятичной строкой ("1990.00"); наш Money — минимальные единицы,
// поэтому делим на 100 (RUB и большинство валют — 2 знака).
import { randomUUID } from 'node:crypto';
import type { CreateCheckoutArgs, NormalizedPaymentEvent, PaymentProvider, PaymentWebhookRequest } from '@maks417/core';

const API = 'https://api.yookassa.ru/v3/payments';
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP']);

/** Минимальные единицы → десятичная строка валюты ("199000" RUB → "1990.00"). */
function minorToDecimalString(amount: number, currency: string): string {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? String(amount) : (amount / 100).toFixed(2);
}

function authHeader(): string {
  const shopId = process.env.YOOKASSA_SHOP_ID ?? '';
  const secret = process.env.YOOKASSA_SECRET_KEY ?? '';
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
        description: `Заказ (корзина ${cart.id})`,
        metadata: { cartId: cart.id },
      }),
    });
    if (!res.ok) throw new Error(`[vitrine] ЮKassa: ${res.status} ${await res.text()}`);
    const payment = (await res.json()) as { confirmation?: { confirmation_url?: string } };
    return { redirectUrl: payment.confirmation?.confirmation_url ?? `${baseUrl}${cancelPath}` };
  },

  async verifyWebhook(req: PaymentWebhookRequest): Promise<NormalizedPaymentEvent> {
    const body = JSON.parse(req.rawBody) as { event?: string; object?: { id?: string } };
    const paymentId = body.object?.id;
    if (!paymentId) return { kind: 'unknown', raw: body };

    // Уведомление не подписано — перепроверяем платёж через API.
    const res = await fetch(`${API}/${paymentId}`, { headers: { Authorization: authHeader() } });
    if (!res.ok) throw new Error(`[vitrine] ЮKassa verify: ${res.status}`);
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
