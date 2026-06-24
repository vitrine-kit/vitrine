// POST /api/checkout — creates a checkout session with the active payment provider for
// the current cart (cookie) via CommerceBackend.startCheckout and returns the
// redirect URL. Provider-agnostic: startCheckout delegates to payments.resolve. Next glue.
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getCommerceBackend } from '@/lib/adapter';

export async function POST() {
  const cartId = (await cookies()).get('vitrine_cart')?.value;
  if (!cartId) return NextResponse.json({ error: 'cart is empty' }, { status: 400 });
  const commerce = await getCommerceBackend();
  const { redirectUrl } = await commerce.startCheckout(cartId);
  return NextResponse.json({ url: redirectUrl });
}
