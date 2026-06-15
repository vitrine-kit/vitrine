// API корзины: POST добавить, PATCH изменить количество, DELETE удалить строку.
// Cart-id в httpOnly cookie. Мутации делегируются CommerceBackend (lib/adapter),
// арифметика — в @maks417/core. Next-glue, не типизируется в монорепо.
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { CommerceBackend } from '@maks417/contracts';
import { getCommerceBackend } from '@/lib/adapter';

const COOKIE = 'vitrine_cart';

async function ensureCartId(commerce: CommerceBackend): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing) return existing;
  const cart = await commerce.createCart();
  jar.set(COOKIE, cart.id, { httpOnly: true, sameSite: 'lax', path: '/' });
  return cart.id;
}

export async function POST(req: Request) {
  const { variantId, quantity = 1 } = (await req.json()) as { variantId: string; quantity?: number };
  const commerce = await getCommerceBackend();
  const id = await ensureCartId(commerce);
  return NextResponse.json(await commerce.addItem(id, variantId, quantity));
}

export async function PATCH(req: Request) {
  const { lineId, quantity } = (await req.json()) as { lineId: string; quantity: number };
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) return NextResponse.json({ error: 'корзина не найдена' }, { status: 400 });
  const commerce = await getCommerceBackend();
  return NextResponse.json(await commerce.updateItem(id, lineId, quantity));
}

export async function DELETE(req: Request) {
  const { lineId } = (await req.json()) as { lineId: string };
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) return NextResponse.json({ error: 'корзина не найдена' }, { status: 400 });
  const commerce = await getCommerceBackend();
  return NextResponse.json(await commerce.removeItem(id, lineId));
}
