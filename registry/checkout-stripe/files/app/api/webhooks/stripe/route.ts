// Stripe webhook: stripeProvider.verifyWebhook (Stripe SDK signature) → normalized
// event → handlePaymentWebhook → the shared fulfillOrderFromEvent creates an order from
// the cart and marks it converted. No provider-specific code here — just glue.
import { NextResponse } from 'next/server';
import { checkRateLimit, clientIpFromHeaders, handlePaymentWebhook } from '@vitrine-kit/core';
import { stripeProvider } from '@/lib/checkout-stripe/provider';
import { fulfillOrderFromEvent } from '@/lib/checkout/fulfill';

const RATE_LIMIT = { limit: 120, windowMs: 60_000 };

export async function POST(req: Request) {
  const { allowed } = checkRateLimit(`webhook:stripe:${clientIpFromHeaders(req.headers)}`, RATE_LIMIT);
  if (!allowed) return NextResponse.json({ error: 'too many requests' }, { status: 429 });

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
    // Don't echo provider-specific error text (e.g. signature failure detail) to the caller.
    console.error('[vitrine] stripe webhook error:', err);
    return NextResponse.json({ error: 'invalid webhook' }, { status: 400 });
  }
}
