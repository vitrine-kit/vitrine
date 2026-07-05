// Paddle webhook: paddleProvider.verifyWebhook (Paddle-Signature) →
// normalized event → handlePaymentWebhook → the shared fulfillOrderFromEvent.
import { NextResponse } from 'next/server';
import { checkRateLimit, clientIpFromHeaders, handlePaymentWebhook } from '@vitrine-kit/core';
import { paddleProvider } from '@/lib/checkout-paddle/provider';
import { fulfillOrderFromEvent } from '@/lib/checkout/fulfill';

const RATE_LIMIT = { limit: 120, windowMs: 60_000 };

export async function POST(req: Request) {
  const { allowed } = checkRateLimit(`webhook:paddle:${clientIpFromHeaders(req.headers)}`, RATE_LIMIT);
  if (!allowed) return NextResponse.json({ error: 'too many requests' }, { status: 429 });

  const rawBody = await req.text();
  const headers = { 'paddle-signature': req.headers.get('paddle-signature') };

  try {
    const result = await handlePaymentWebhook({
      provider: paddleProvider,
      req: { rawBody, headers },
      handlers: { onCheckoutCompleted: (event) => fulfillOrderFromEvent(event, 'paddle') },
    });
    return NextResponse.json(result);
  } catch (err) {
    // Don't echo provider-specific error text (e.g. signature failure detail) to the caller.
    console.error('[vitrine] paddle webhook error:', err);
    return NextResponse.json({ error: 'invalid webhook' }, { status: 400 });
  }
}
