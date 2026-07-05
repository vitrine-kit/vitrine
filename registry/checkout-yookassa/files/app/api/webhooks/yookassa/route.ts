// YooKassa webhook: the notification is unsigned — yookassaProvider.verifyWebhook
// re-checks the payment via the API (we trust only succeeded) → normalized
// event → handlePaymentWebhook → the shared fulfillOrderFromEvent.
import { NextResponse } from 'next/server';
import { checkRateLimit, clientIpFromHeaders, handlePaymentWebhook } from '@vitrine-kit/core';
import { yookassaProvider } from '@/lib/checkout-yookassa/provider';
import { fulfillOrderFromEvent } from '@/lib/checkout/fulfill';

const RATE_LIMIT = { limit: 120, windowMs: 60_000 };

export async function POST(req: Request) {
  const { allowed } = checkRateLimit(`webhook:yookassa:${clientIpFromHeaders(req.headers)}`, RATE_LIMIT);
  if (!allowed) return NextResponse.json({ error: 'too many requests' }, { status: 429 });

  const rawBody = await req.text();

  try {
    const result = await handlePaymentWebhook({
      provider: yookassaProvider,
      req: { rawBody, headers: {} },
      handlers: { onCheckoutCompleted: (event) => fulfillOrderFromEvent(event, 'yookassa') },
    });
    return NextResponse.json(result);
  } catch (err) {
    // Don't echo provider-specific error text (e.g. re-confirmation failure detail) to the caller.
    console.error('[vitrine] yookassa webhook error:', err);
    return NextResponse.json({ error: 'invalid webhook' }, { status: 400 });
  }
}
