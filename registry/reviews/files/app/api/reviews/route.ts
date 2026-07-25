// POST /api/reviews — append a review onto the product.reviews JSON array.
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { checkRateLimit, clientIpFromHeaders } from '@vitrine-kit/core';
import { parseReviews, type ProductReview } from '@/lib/reviews/types';

const RATE_LIMIT = { limit: 10, windowMs: 60_000 };

export async function POST(req: Request) {
  const { allowed, retryAfterMs } = checkRateLimit(`reviews:${clientIpFromHeaders(req.headers)}`, RATE_LIMIT);
  if (!allowed) {
    return NextResponse.json(
      { error: 'too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((retryAfterMs ?? 0) / 1000)) } },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    productId?: unknown;
    author?: unknown;
    rating?: unknown;
    body?: unknown;
  } | null;
  const productId = typeof body?.productId === 'string' ? body.productId : '';
  const author = typeof body?.author === 'string' ? body.author.trim().slice(0, 80) : '';
  const text = typeof body?.body === 'string' ? body.body.trim().slice(0, 2000) : '';
  const rating = typeof body?.rating === 'number' ? body.rating : Number(body?.rating);
  if (!productId || !author || !text || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const payload = await getPayload({ config });
  const doc = await payload.findByID({ collection: 'products', id: productId, depth: 0 }).catch(() => null);
  if (!doc) return NextResponse.json({ error: 'product not found' }, { status: 404 });

  const review: ProductReview = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    author,
    rating,
    body: text,
    createdAt: new Date().toISOString(),
  };
  const existing = parseReviews((doc as { reviews?: unknown }).reviews);
  const reviews = [review, ...existing].slice(0, 100);

  await payload.update({
    collection: 'products',
    id: productId,
    data: { reviews },
    overrideAccess: true,
  });

  return NextResponse.json({ review });
}
