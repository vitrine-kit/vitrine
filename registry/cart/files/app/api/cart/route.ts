// Cart API: POST add, PATCH change quantity, DELETE remove a line.
// Cart id in an httpOnly cookie. Mutations are delegated to CommerceBackend (lib/adapter),
// the arithmetic lives in @vitrine-kit/core. Next glue, not typechecked in the monorepo.
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { CommerceBackend } from '@vitrine-kit/contracts';
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
  if (!id) return NextResponse.json({ error: 'cart not found' }, { status: 400 });
  const commerce = await getCommerceBackend();
  return NextResponse.json(await commerce.updateItem(id, lineId, quantity));
}

export async function DELETE(req: Request) {
  const { lineId } = (await req.json()) as { lineId: string };
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) return NextResponse.json({ error: 'cart not found' }, { status: 400 });
  const commerce = await getCommerceBackend();
  return NextResponse.json(await commerce.removeItem(id, lineId));
}
