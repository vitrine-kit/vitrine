// Stripe webhook: stripeProvider.verifyWebhook (подпись Stripe SDK) → нормализованное
// событие → handlePaymentWebhook → общий fulfillOrderFromEvent создаёт заказ из
// корзины и помечает её converted. Провайдер-специфичного кода тут нет — только склейка.
import { NextResponse } from 'next/server';
import { handlePaymentWebhook } from '@vitrine-kit/core';
import { stripeProvider } from '@/lib/checkout-stripe/provider';
import { fulfillOrderFromEvent } from '@/lib/checkout/fulfill';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const headers = { 'stripe-signature': req.headers.get('stripe-signature') };

  try {
    const result = await handlePaymentWebhook({
      provider: stripeProvider,
      req: { rawBody, headers },
      handlers: { onCheckoutCompleted: (event) => fulfillOrderFromEvent(event, 'stripe') },
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
