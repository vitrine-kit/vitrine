// Stripe webhook: stripeProvider.verifyWebhook (Stripe SDK signature) → normalized
// event → handlePaymentWebhook → the shared fulfillOrderFromEvent creates an order from
// the cart and marks it converted. No provider-specific code here — just glue.
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
