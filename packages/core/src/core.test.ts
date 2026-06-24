import { describe, expect, it, vi } from 'vitest';
import { isValidElement, type ComponentType, type ReactElement } from 'react';
import type { CatalogSource, CommerceBackend, Order, SiteConfig } from '@vitrine-kit/contracts';
import { createSlotRegistry } from './slots/registry.js';
import { createAdapterRegistry, type AdapterFactory } from './adapter/resolver.js';
import { runPipeline, type OrderStage } from './order/pipeline.js';
import { handlePaymentWebhook } from './payment/webhook.js';
import { createPaymentRegistry } from './payment/registry.js';
import type { PaymentProvider, PaymentProviderName } from './payment/provider.js';
import {
  addCartLine,
  cartItemCount,
  emptyCart,
  recalcCart,
  removeCartLine,
  setCartLineQty,
} from './commerce/cart.js';
import { buildOrderFromCart } from './commerce/order.js';
import { shouldCreateOrder } from './order/idempotency.js';
import { Slot } from './react.js';

const A: ComponentType<Record<string, unknown>> = () => null;
const B: ComponentType<Record<string, unknown>> = () => null;

describe('slot registry', () => {
  it('sorts by order, then by registration order', () => {
    const reg = createSlotRegistry<ComponentType<Record<string, unknown>>>();
    reg.register({ slot: 'product.below-description', component: B, order: 20 });
    reg.register({ slot: 'product.below-description', component: A, order: 10 });
    expect(reg.get('product.below-description').map((m) => m.component)).toEqual([A, B]);
  });

  it('empty slot → []', () => {
    const reg = createSlotRegistry();
    expect(reg.get('home.hero')).toEqual([]);
  });
});

describe('<Slot>', () => {
  it('renders slot components in order', () => {
    const reg = createSlotRegistry<ComponentType<Record<string, unknown>>>();
    reg.register({ slot: 'home.hero', component: B, order: 2 });
    reg.register({ slot: 'home.hero', component: A, order: 1 });
    const el = Slot({ name: 'home.hero', registry: reg }) as ReactElement;
    expect(isValidElement(el)).toBe(true);
    const children = (el.props as { children: ReactElement[] }).children;
    expect(children.map((c) => c.type)).toEqual([A, B]);
  });

  it('empty slot → fallback', () => {
    const reg = createSlotRegistry<ComponentType<Record<string, unknown>>>();
    expect(Slot({ name: 'home.hero', registry: reg, fallback: 'empty' })).toBe('empty');
  });
});

describe('adapter registry', () => {
  const config = { backend: 'payload', tier: 'simple-store' } as unknown as SiteConfig;
  const factory: AdapterFactory = {
    backend: 'payload',
    createCatalog: () => ({}) as CatalogSource,
    createCommerce: () => ({}) as CommerceBackend,
  };

  it('resolves catalog and commerce by backend', () => {
    const reg = createAdapterRegistry();
    reg.register(factory);
    expect(reg.resolveCatalog(config)).toBeDefined();
    expect(reg.resolveCommerce(config)).toBeDefined();
  });

  it('throws for an unregistered backend', () => {
    const reg = createAdapterRegistry();
    expect(() => reg.resolveCatalog(config)).toThrow();
  });

  it('throws on commerce for tier=catalog', () => {
    const reg = createAdapterRegistry();
    reg.register(factory);
    const catalogCfg = { backend: 'payload', tier: 'catalog' } as unknown as SiteConfig;
    expect(() => reg.resolveCommerce(catalogCfg)).toThrow();
  });
});

describe('order pipeline', () => {
  it('runs the stages in order', async () => {
    const steps: string[] = [];
    const stages: OrderStage<{ n: number }>[] = [
      (ctx) => { steps.push('a'); return { n: ctx.n + 1 }; },
      async (ctx) => { steps.push('b'); return { n: ctx.n * 2 }; },
    ];
    const out = await runPipeline({ n: 1 }, stages);
    expect(steps).toEqual(['a', 'b']);
    expect(out.n).toBe(4);
  });
});

describe('payment registry', () => {
  const provider = (name: PaymentProviderName): PaymentProvider => ({
    name,
    createCheckout: async () => ({ redirectUrl: `https://pay.example/${name}` }),
    verifyWebhook: async () => ({ kind: 'unknown', raw: {} }),
  });
  const cfg = (payments?: PaymentProviderName) =>
    ({ integrations: { payments } }) as unknown as SiteConfig;

  it('register + resolve by integrations.payments', () => {
    const reg = createPaymentRegistry();
    reg.register(provider('stripe'));
    reg.register(provider('yookassa'));
    expect(reg.resolve(cfg('yookassa')).name).toBe('yookassa');
    expect(reg.get('stripe')?.name).toBe('stripe');
  });

  it('throws if the provider is not set or not registered', () => {
    const reg = createPaymentRegistry();
    expect(() => reg.resolve(cfg(undefined))).toThrow(/not set/);
    expect(() => reg.resolve(cfg('paddle'))).toThrow(/is not registered/);
  });
});

describe('payment webhook (provider-agnostic)', () => {
  const okProvider: PaymentProvider = {
    name: 'stripe',
    createCheckout: async () => ({ redirectUrl: 'https://pay.example/redirect' }),
    verifyWebhook: async () => ({ kind: 'checkout_completed', raw: {} }),
  };
  const badProvider: PaymentProvider = {
    name: 'stripe',
    createCheckout: async () => ({ redirectUrl: '' }),
    verifyWebhook: async () => { throw new Error('bad signature'); },
  };

  it('dispatches checkout_completed → runs the order pipeline', async () => {
    const onCheckoutCompleted = vi.fn(async () => {
      await runPipeline({ created: false }, [(c) => ({ ...c, created: true })]);
    });
    const res = await handlePaymentWebhook({
      provider: okProvider, req: { rawBody: '{}', headers: {} }, handlers: { onCheckoutCompleted },
    });
    expect(onCheckoutCompleted).toHaveBeenCalledOnce();
    expect(res).toEqual({ received: true, kind: 'checkout_completed', handled: true });
  });

  it('throws on an invalid signature', async () => {
    await expect(
      handlePaymentWebhook({ provider: badProvider, req: { rawBody: '{}', headers: {} } }),
    ).rejects.toThrow('bad signature');
  });
});

describe('cart arithmetic (commerce)', () => {
  const line = (over: Partial<Parameters<typeof addCartLine>[1]> = {}) => ({
    id: 'l1', variantId: 'v1', productId: 'p1', title: 'T-Shirt', unitPrice: 199000, quantity: 1, ...over,
  });

  it('addCartLine: new line and merging the same variant', () => {
    let cart = addCartLine(emptyCart('c1', 'USD'), line());
    expect(cart.lines).toHaveLength(1);
    expect(cart.subtotal).toBe(199000);
    cart = addCartLine(cart, line({ id: 'l2', quantity: 2 })); // same variantId → merge
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]?.quantity).toBe(3);
    expect(cart.subtotal).toBe(597000);
    expect(cart.total).toBe(597000);
    expect(cartItemCount(cart)).toBe(3);
  });

  it('addCartLine rejects a non-integer/non-positive quantity', () => {
    const empty = emptyCart('c1', 'USD');
    expect(() => addCartLine(empty, line({ quantity: 0 }))).toThrow(/invalid line quantity/);
    expect(() => addCartLine(empty, line({ quantity: -1 }))).toThrow(/invalid line quantity/);
    expect(() => addCartLine(empty, line({ quantity: 2.5 }))).toThrow(/invalid line quantity/);
  });

  it('setCartLineQty rejects a non-integer quantity', () => {
    const cart = addCartLine(emptyCart('c1', 'USD'), line());
    expect(() => setCartLineQty(cart, 'l1', 1.5)).toThrow(/invalid quantity/);
  });

  it('setCartLineQty changes the quantity, qty=0 removes', () => {
    let cart = addCartLine(emptyCart('c1', 'USD'), line());
    cart = setCartLineQty(cart, 'l1', 4);
    expect(cart.lines[0]?.quantity).toBe(4);
    expect(cart.subtotal).toBe(796000);
    cart = setCartLineQty(cart, 'l1', 0);
    expect(cart.lines).toHaveLength(0);
    expect(cart.subtotal).toBe(0);
  });

  it('removeCartLine and discount in recalcCart', () => {
    let cart = addCartLine(emptyCart('c1', 'USD'), line({ unitPrice: 1000, quantity: 2 }));
    cart = recalcCart({ ...cart, discountTotal: 500 });
    expect(cart.subtotal).toBe(2000);
    expect(cart.total).toBe(1500);
    cart = removeCartLine(cart, 'l1');
    expect(cart.lines).toHaveLength(0);
  });

  it('shouldCreateOrder: converted/existing ref → false, fresh → true', () => {
    expect(shouldCreateOrder({ cartStatus: 'converted' })).toBe(false);
    expect(shouldCreateOrder({ providerRef: 'cs_1', existingOrderRefs: ['cs_1'] })).toBe(false);
    expect(shouldCreateOrder({ cartStatus: 'active', providerRef: 'cs_2', existingOrderRefs: ['cs_1'] })).toBe(true);
    expect(shouldCreateOrder({})).toBe(true);
  });

  it('double webhook delivery (provider retry) → exactly one order', async () => {
    const cart = addCartLine(emptyCart('cart1', 'USD'), line({ quantity: 1 }));
    const cartStore = new Map([[cart.id, { ...cart, status: 'active' as string }]]);
    const orders: Order[] = [];
    const provider: PaymentProvider = {
      name: 'stripe',
      createCheckout: async () => ({ redirectUrl: '' }),
      verifyWebhook: async () => ({
        kind: 'checkout_completed', cartId: 'cart1', providerRef: 'cs_test', email: 'x@y.z', raw: {},
      }),
    };
    const deliver = () =>
      handlePaymentWebhook({
        provider, req: { rawBody: '{}', headers: {} },
        handlers: {
          onCheckoutCompleted: async (e) => {
            const doc = cartStore.get(e.cartId ?? '');
            if (!doc) return;
            const ok = shouldCreateOrder({
              cartStatus: doc.status,
              providerRef: e.providerRef,
              existingOrderRefs: orders.map((o) => o.number),
            });
            if (!ok) return;
            orders.push(buildOrderFromCart(doc, { id: doc.id, number: e.providerRef, email: e.email }));
            doc.status = 'converted';
          },
        },
      });

    await deliver();
    await deliver(); // the provider retries the same event
    expect(orders).toHaveLength(1);
    expect(orders[0]?.number).toBe('cs_test');
  });

  it('checkout_completed → order from cart (full chain)', async () => {
    const cart = addCartLine(emptyCart('cart1', 'USD'), line({ quantity: 2 }));
    const carts = new Map([[cart.id, cart]]);
    const created: Order[] = [];
    const provider: PaymentProvider = {
      name: 'stripe',
      createCheckout: async () => ({ redirectUrl: '' }),
      verifyWebhook: async () => ({ kind: 'checkout_completed', cartId: 'cart1', email: 'x@y.z', raw: {} }),
    };

    const res = await handlePaymentWebhook({
      provider, req: { rawBody: '{}', headers: {} },
      handlers: {
        onCheckoutCompleted: async (e) => {
          const found = carts.get(e.cartId ?? '');
          if (found) created.push(buildOrderFromCart(found, { id: 'o1', email: e.email }));
        },
      },
    });

    expect(res.handled).toBe(true);
    expect(created).toHaveLength(1);
    expect(created[0]?.status).toBe('paid');
    expect(created[0]?.total).toBe(398000);
    expect(created[0]?.email).toBe('x@y.z');
  });
});
