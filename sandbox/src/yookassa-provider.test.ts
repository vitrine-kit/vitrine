// Runtime tests for the YooKassa provider — the only SDK-free one (pure fetch), so its
// create/verify logic is executable in the monorepo. Stripe/Paddle providers pull their
// SDKs (not installed here) and stay review+typecheck-verified.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cart } from '@vitrine-kit/contracts';
import { yookassaProvider } from '../../registry/checkout-yookassa/files/lib/checkout-yookassa/provider.js';

const cart: Cart = {
  id: 'cart1',
  currency: 'RUB',
  lines: [
    { id: 'l1', variantId: 'v1', productId: 'p1', title: 'T', quantity: 2, unitPrice: 99500, lineTotal: 199000 },
  ],
  subtotal: 199000,
  total: 199000,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const KEYS = ['YOOKASSA_SHOP_ID', 'YOOKASSA_SECRET_KEY'] as const;
const prevEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of KEYS) prevEnv[k] = process.env[k];
  process.env.YOOKASSA_SHOP_ID = 'shop';
  process.env.YOOKASSA_SECRET_KEY = 'secret';
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of KEYS) {
    if (prevEnv[k] === undefined) delete process.env[k];
    else process.env[k] = prevEnv[k];
  }
});

describe('yookassaProvider.createCheckout', () => {
  it('creates a payment: decimal amount, metadata.cartId, Basic auth → confirmation_url', async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      expect(String(url)).toBe('https://api.yookassa.ru/v3/payments');
      const body = JSON.parse(String(init?.body)) as {
        amount: { value: string; currency: string };
        metadata: { cartId: string };
      };
      expect(body.amount).toEqual({ value: '1990.00', currency: 'RUB' }); // 199000 minor → "1990.00"
      expect(body.metadata.cartId).toBe('cart1');
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe(`Basic ${Buffer.from('shop:secret').toString('base64')}`);
      expect(headers['Idempotence-Key']).toBeTruthy();
      return jsonResponse(200, { confirmation: { confirmation_url: 'https://yookassa/redirect' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await yookassaProvider.createCheckout({ cart, baseUrl: 'https://shop.example' });
    expect(res.redirectUrl).toBe('https://yookassa/redirect');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('missing required env → clear [vitrine] error before any request', async () => {
    delete process.env.YOOKASSA_SECRET_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(yookassaProvider.createCheckout({ cart, baseUrl: 'https://x' })).rejects.toThrow(
      /YOOKASSA_SECRET_KEY is not set/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('yookassaProvider.verifyWebhook (unsigned → API re-check)', () => {
  const req = (paymentId: string) => ({
    rawBody: JSON.stringify({ event: 'payment.succeeded', object: { id: paymentId } }),
    headers: {},
  });

  it('succeeded → checkout_completed with cartId/providerRef', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(200, { id: 'p1', status: 'succeeded', metadata: { cartId: 'cart1' } })),
    );
    const ev = await yookassaProvider.verifyWebhook(req('p1'));
    expect(ev).toMatchObject({ kind: 'checkout_completed', cartId: 'cart1', providerRef: 'p1' });
  });

  it('canceled → payment_failed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { id: 'p1', status: 'canceled' })));
    expect((await yookassaProvider.verifyWebhook(req('p1'))).kind).toBe('payment_failed');
  });

  it('404 (forged/foreign payment id) → acked as unknown, not an error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(404, { type: 'error' })));
    expect((await yookassaProvider.verifyWebhook(req('nope'))).kind).toBe('unknown');
  });

  it('transient API failure → throws (non-200 makes YooKassa redeliver)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(503, {})));
    await expect(yookassaProvider.verifyWebhook(req('p1'))).rejects.toThrow(/503/);
  });

  it('notification without a payment id → unknown, no API call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const ev = await yookassaProvider.verifyWebhook({ rawBody: '{}', headers: {} });
    expect(ev.kind).toBe('unknown');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
