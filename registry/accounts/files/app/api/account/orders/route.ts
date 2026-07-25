// GET /api/account/orders?email= — rate-limited guest order lookup.
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { checkRateLimit, clientIpFromHeaders } from '@vitrine-kit/core';

const RATE_LIMIT = { limit: 10, windowMs: 60_000 };

export async function GET(req: Request) {
  const { allowed, retryAfterMs } = checkRateLimit(`account:${clientIpFromHeaders(req.headers)}`, RATE_LIMIT);
  if (!allowed) {
    return NextResponse.json(
      { error: 'too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((retryAfterMs ?? 0) / 1000)) } },
    );
  }
  const email = new URL(req.url).searchParams.get('email')?.trim().toLowerCase() ?? '';
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'orders',
    where: { email: { equals: email } },
    sort: '-createdAt',
    limit: 50,
    overrideAccess: true,
  });
  return NextResponse.json({
    orders: res.docs.map((d) => ({
      id: String(d.id),
      status: (d as { status?: string }).status,
      total: (d as { total?: number }).total,
      currency: (d as { currency?: string }).currency,
      createdAt: (d as { createdAt?: string }).createdAt,
      paymentRef: (d as { paymentRef?: string }).paymentRef,
    })),
  });
}
