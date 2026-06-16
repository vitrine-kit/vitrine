// POST /api/checkout — создаёт checkout-сессию активного платёжного провайдера для
// текущей корзины (cookie) через CommerceBackend.startCheckout и возвращает URL
// редиректа. Провайдер-агностично: startCheckout делегирует payments.resolve. Next-glue.
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getCommerceBackend } from '@/lib/adapter';

export async function POST() {
  const cartId = (await cookies()).get('vitrine_cart')?.value;
  if (!cartId) return NextResponse.json({ error: 'корзина пуста' }, { status: 400 });
  const commerce = await getCommerceBackend();
  const { redirectUrl } = await commerce.startCheckout(cartId);
  return NextResponse.json({ url: redirectUrl });
}
