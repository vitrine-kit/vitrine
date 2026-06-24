// YooKassa webhook: the notification is unsigned — yookassaProvider.verifyWebhook
// re-checks the payment via the API (we trust only succeeded) → normalized
// event → handlePaymentWebhook → the shared fulfillOrderFromEvent.
import { NextResponse } from 'next/server';
import { handlePaymentWebhook } from '@vitrine-kit/core';
import { yookassaProvider } from '@/lib/checkout-yookassa/provider';
import { fulfillOrderFromEvent } from '@/lib/checkout/fulfill';

export async function POST(req: Request) {
  const rawBody = await req.text();

  try {
    const result = await handlePaymentWebhook({
      provider: yookassaProvider,
      req: { rawBody, headers: {} },
      handlers: { onCheckoutCompleted: (event) => fulfillOrderFromEvent(event, 'yookassa') },
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
