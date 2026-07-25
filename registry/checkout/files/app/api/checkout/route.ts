// POST /api/checkout — creates a checkout session with the active payment provider for
// the current cart (cookie) via CommerceBackend.startCheckout and returns the
// redirect URL. Provider-agnostic: startCheckout delegates to payments.resolve. Next glue.
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { checkRateLimit, clientIpFromHeaders } from '@vitrine-kit/core';
import { getCommerceBackend } from '@/lib/adapter';

const RATE_LIMIT = { limit: 10, windowMs: 60_000 };

function publicError(error: unknown): string {
  if (!(error instanceof Error)) return 'Checkout is unavailable — try again later.';
  return error.message.replace(/^\[vitrine\]\s*/, '');
}

export async function POST(req: Request) {
  const { allowed, retryAfterMs } = checkRateLimit(`checkout:${clientIpFromHeaders(req.headers)}`, RATE_LIMIT);
  if (!allowed) {
    return NextResponse.json(
      { error: 'too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((retryAfterMs ?? 0) / 1000)) } },
    );
  }
  const cartId = (await cookies()).get('vitrine_cart')?.value;
  if (!cartId) return NextResponse.json({ error: 'cart is empty' }, { status: 400 });
  try {
    const commerce = await getCommerceBackend();
    const { redirectUrl } = await commerce.startCheckout(cartId);
    return NextResponse.json({ url: redirectUrl });
  } catch (error) {
    const message = publicError(error);
    const status = /is not set|empty/i.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
