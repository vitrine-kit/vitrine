// Paddle webhook: paddleProvider.verifyWebhook (подпись Paddle-Signature) →
// нормализованное событие → handlePaymentWebhook → общий fulfillOrderFromEvent.
import { NextResponse } from 'next/server';
import { handlePaymentWebhook } from '@vitrine-kit/core';
import { paddleProvider } from '@/lib/checkout-paddle/provider';
import { fulfillOrderFromEvent } from '@/lib/checkout/fulfill';

export async function POST(req: Request) {
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
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
