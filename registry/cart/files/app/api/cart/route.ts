// Cart API: POST add, PATCH change quantity, DELETE remove a line.
// Cart id in an httpOnly cookie. Mutations are delegated to CommerceBackend (lib/adapter),
// the arithmetic lives in @vitrine-kit/core. Next glue, not typechecked in the monorepo.
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { checkRateLimit, clientIpFromHeaders } from '@vitrine-kit/core';
import type { CommerceBackend } from '@vitrine-kit/contracts';
import { getCommerceBackend } from '@/lib/adapter';

const COOKIE = 'vitrine_cart';
const MAX_QUANTITY = 999;
const RATE_LIMIT = { limit: 30, windowMs: 60_000 };

/** Per-IP rate limit on cart mutations — returns a 429 response, or null if under the limit. */
function rateLimited(req: Request): NextResponse | null {
  const { allowed, retryAfterMs } = checkRateLimit(`cart:${clientIpFromHeaders(req.headers)}`, RATE_LIMIT);
  if (allowed) return null;
  return NextResponse.json(
    { error: 'too many requests' },
    { status: 429, headers: { 'Retry-After': String(Math.ceil((retryAfterMs ?? 0) / 1000)) } },
  );
}

function parseQuantity(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(n) && n >= 0 && n <= MAX_QUANTITY ? n : null;
}

function parseAddItemBody(body: unknown): { variantId: string; quantity: number } | null {
  if (typeof body !== 'object' || body === null) return null;
  const { variantId, quantity = 1 } = body as { variantId?: unknown; quantity?: unknown };
  if (typeof variantId !== 'string' || variantId.length === 0) return null;
  const parsedQuantity = parseQuantity(quantity);
  if (parsedQuantity === null || parsedQuantity < 1) return null;
  return { variantId, quantity: parsedQuantity };
}

function parseUpdateItemBody(body: unknown): { lineId: string; quantity: number } | null {
  if (typeof body !== 'object' || body === null) return null;
  const { lineId, quantity } = body as { lineId?: unknown; quantity?: unknown };
  if (typeof lineId !== 'string' || lineId.length === 0) return null;
  const parsedQuantity = parseQuantity(quantity);
  if (parsedQuantity === null) return null;
  return { lineId, quantity: parsedQuantity };
}

function parseRemoveItemBody(body: unknown): { lineId: string } | null {
  if (typeof body !== 'object' || body === null) return null;
  const { lineId } = body as { lineId?: unknown };
  if (typeof lineId !== 'string' || lineId.length === 0) return null;
  return { lineId };
}

function publicError(error: unknown): string {
  if (!(error instanceof Error)) return 'cart update failed';
  return error.message.replace(/^\[vitrine\]\s*/, '');
}

async function ensureCartId(commerce: CommerceBackend): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing) return existing;
  const cart = await commerce.createCart();
  jar.set(COOKIE, cart.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });
  return cart.id;
}

export async function GET() {
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) {
    return NextResponse.json({ id: null, lines: [], currency: 'USD', subtotal: 0, total: 0 });
  }
  try {
    const commerce = await getCommerceBackend();
    const cart = await commerce.getCart(id);
    return NextResponse.json(cart ?? { id, lines: [], currency: 'USD', subtotal: 0, total: 0 });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const limited = rateLimited(req);
  if (limited) return limited;
  const parsed = parseAddItemBody(await req.json());
  if (!parsed) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  try {
    const commerce = await getCommerceBackend();
    const id = await ensureCartId(commerce);
    return NextResponse.json(await commerce.addItem(id, parsed.variantId, parsed.quantity));
  } catch (error) {
    const message = publicError(error);
    const status = /out of stock|not found/i.test(message) ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  const limited = rateLimited(req);
  if (limited) return limited;
  const parsed = parseUpdateItemBody(await req.json());
  if (!parsed) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) return NextResponse.json({ error: 'cart not found' }, { status: 400 });
  try {
    const commerce = await getCommerceBackend();
    return NextResponse.json(await commerce.updateItem(id, parsed.lineId, parsed.quantity));
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const limited = rateLimited(req);
  if (limited) return limited;
  const parsed = parseRemoveItemBody(await req.json());
  if (!parsed) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) return NextResponse.json({ error: 'cart not found' }, { status: 400 });
  try {
    const commerce = await getCommerceBackend();
    return NextResponse.json(await commerce.removeItem(id, parsed.lineId));
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: 500 });
  }
}
