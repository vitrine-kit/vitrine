// PaymentProvider поверх Paddle Billing. SDK живёт здесь (в фиче), не в ядре.
// createCheckout создаёт transaction с non-catalog line items (цены задаются на лету
// из корзины) и custom_data.cartId → возвращает hosted checkout URL. verifyWebhook
// проверяет подпись Paddle-Signature (HMAC) и нормализует событие.
//
// Paddle ожидает суммы строкой в минимальных единицах валюты (как наш Money), поэтому
// String(unitPrice) передаём как есть. Для hosted-checkout в дашборде Paddle нужен
// default payment link ИЛИ задайте PADDLE_CHECKOUT_URL (override).
import { Environment, Paddle, type EventEntity } from '@paddle/paddle-node-sdk';
import type { CreateCheckoutArgs, NormalizedPaymentEvent, PaymentProvider, PaymentWebhookRequest } from '@maks417/core';

function client(): Paddle {
  return new Paddle(process.env.PADDLE_API_KEY ?? '', {
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
    const secret = process.env.PADDLE_WEBHOOK_SECRET ?? '';
    const signature = req.headers['paddle-signature'] ?? '';
    // Бросает при неверной подписи — handlePaymentWebhook отдаст 400.
    const event = (await paddle.webhooks.unmarshal(req.rawBody, secret, signature)) as EventEntity | null;
    if (!event) return { kind: 'unknown', raw: req.rawBody };

    if (event.eventType === 'transaction.completed' || event.eventType === 'transaction.paid') {
      const data = event.data as { id?: string; customData?: { cartId?: string } | null };
      const cartId = (data.customData ?? undefined)?.cartId;
      return { kind: 'checkout_completed', cartId, providerRef: data.id, raw: event };
    }
    if (event.eventType === 'transaction.payment_failed') {
      return { kind: 'payment_failed', raw: event };
    }
    return { kind: 'unknown', raw: event };
  },
};
