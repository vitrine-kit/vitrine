import { describe, expect, it, vi } from 'vitest';
import { isValidElement, type ComponentType, type ReactElement } from 'react';
import type { CatalogSource, CommerceBackend, Order, SiteConfig } from '@maks417/contracts';
import { createSlotRegistry } from './slots/registry.js';
import { createAdapterRegistry, type AdapterFactory } from './adapter/resolver.js';
import { runPipeline, type OrderStage } from './order/pipeline.js';
import { handleStripeWebhook, type StripeVerifier } from './stripe/webhook.js';
import {
  addCartLine,
  cartItemCount,
  emptyCart,
  recalcCart,
  removeCartLine,
  setCartLineQty,
} from './commerce/cart.js';
import { buildOrderFromCart, cartToStripeLineItems } from './commerce/order.js';
import { Slot } from './react.js';

const A: ComponentType<Record<string, unknown>> = () => null;
const B: ComponentType<Record<string, unknown>> = () => null;

describe('slot registry', () => {
  it('сортирует по order, затем по порядку регистрации', () => {
    const reg = createSlotRegistry<ComponentType<Record<string, unknown>>>();
    reg.register({ slot: 'product.below-description', component: B, order: 20 });
    reg.register({ slot: 'product.below-description', component: A, order: 10 });
    expect(reg.get('product.below-description').map((m) => m.component)).toEqual([A, B]);
  });

  it('пустой слот → []', () => {
    const reg = createSlotRegistry();
    expect(reg.get('home.hero')).toEqual([]);
  });
});

describe('<Slot>', () => {
  it('рендерит компоненты слота по порядку', () => {
    const reg = createSlotRegistry<ComponentType<Record<string, unknown>>>();
    reg.register({ slot: 'home.hero', component: B, order: 2 });
    reg.register({ slot: 'home.hero', component: A, order: 1 });
    const el = Slot({ name: 'home.hero', registry: reg }) as ReactElement;
    expect(isValidElement(el)).toBe(true);
    const children = (el.props as { children: ReactElement[] }).children;
    expect(children.map((c) => c.type)).toEqual([A, B]);
  });

  it('пустой слот → fallback', () => {
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

  it('резолвит каталог и коммерцию по backend', () => {
    const reg = createAdapterRegistry();
    reg.register(factory);
    expect(reg.resolveCatalog(config)).toBeDefined();
    expect(reg.resolveCommerce(config)).toBeDefined();
  });

  it('бросает для незарегистрированного backend', () => {
    const reg = createAdapterRegistry();
    expect(() => reg.resolveCatalog(config)).toThrow();
  });

  it('бросает на commerce для tier=catalog', () => {
    const reg = createAdapterRegistry();
    reg.register(factory);
    const catalogCfg = { backend: 'payload', tier: 'catalog' } as unknown as SiteConfig;
    expect(() => reg.resolveCommerce(catalogCfg)).toThrow();
  });
});

describe('order pipeline', () => {
  it('прогоняет шаги по порядку', async () => {
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

describe('stripe webhook (моки Stripe)', () => {
  const verifyOk: StripeVerifier = () => ({ type: 'checkout.session.completed', data: { object: {} } });
  const verifyBad: StripeVerifier = () => { throw new Error('bad signature'); };

  it('диспатчит checkout.session.completed → запускает пайплайн заказа', async () => {
    const onCheckoutCompleted = vi.fn(async () => {
      await runPipeline({ created: false }, [(c) => ({ ...c, created: true })]);
    });
    const res = await handleStripeWebhook({
      payload: '{}', signature: 'sig', verify: verifyOk, handlers: { onCheckoutCompleted },
    });
    expect(onCheckoutCompleted).toHaveBeenCalledOnce();
    expect(res).toEqual({ received: true, type: 'checkout.session.completed', handled: true });
  });

  it('бросает при неверной подписи', async () => {
    await expect(
      handleStripeWebhook({ payload: '{}', signature: 'x', verify: verifyBad }),
    ).rejects.toThrow('bad signature');
  });
});

describe('корзинная арифметика (commerce)', () => {
  const line = (over: Partial<Parameters<typeof addCartLine>[1]> = {}) => ({
    id: 'l1', variantId: 'v1', productId: 'p1', title: 'Футболка', unitPrice: 199000, quantity: 1, ...over,
  });

  it('addCartLine: новая строка и слияние того же варианта', () => {
    let cart = addCartLine(emptyCart('c1', 'RUB'), line());
    expect(cart.lines).toHaveLength(1);
    expect(cart.subtotal).toBe(199000);
    cart = addCartLine(cart, line({ id: 'l2', quantity: 2 })); // тот же variantId → слияние
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]?.quantity).toBe(3);
    expect(cart.subtotal).toBe(597000);
    expect(cart.total).toBe(597000);
    expect(cartItemCount(cart)).toBe(3);
  });

  it('setCartLineQty меняет количество, qty=0 удаляет', () => {
    let cart = addCartLine(emptyCart('c1', 'RUB'), line());
    cart = setCartLineQty(cart, 'l1', 4);
    expect(cart.lines[0]?.quantity).toBe(4);
    expect(cart.subtotal).toBe(796000);
    cart = setCartLineQty(cart, 'l1', 0);
    expect(cart.lines).toHaveLength(0);
    expect(cart.subtotal).toBe(0);
  });

  it('removeCartLine и скидка в recalcCart', () => {
    let cart = addCartLine(emptyCart('c1', 'USD'), line({ unitPrice: 1000, quantity: 2 }));
    cart = recalcCart({ ...cart, discountTotal: 500 });
    expect(cart.subtotal).toBe(2000);
    expect(cart.total).toBe(1500);
    cart = removeCartLine(cart, 'l1');
    expect(cart.lines).toHaveLength(0);
  });

  it('cartToStripeLineItems: валюта в нижнем регистре, unit_amount = минимальные единицы', () => {
    const cart = addCartLine(emptyCart('c1', 'USD'), line({ unitPrice: 1000, quantity: 2 }));
    const items = cartToStripeLineItems(cart);
    expect(items[0]?.price_data.currency).toBe('usd');
    expect(items[0]?.price_data.unit_amount).toBe(1000);
    expect(items[0]?.quantity).toBe(2);
  });

  it('checkout.session.completed → заказ из корзины (полная цепочка, моки Stripe)', async () => {
    const cart = addCartLine(emptyCart('cart1', 'RUB'), line({ quantity: 2 }));
    const carts = new Map([[cart.id, cart]]);
    const created: Order[] = [];
    const verify: StripeVerifier = () => ({
      type: 'checkout.session.completed',
      data: { object: { metadata: { cartId: 'cart1' }, customer_email: 'x@y.z' } },
    });

    const res = await handleStripeWebhook({
      payload: '{}', signature: 's', verify,
      handlers: {
        onCheckoutCompleted: async (e) => {
          const obj = e.data.object as { metadata?: { cartId?: string }; customer_email?: string };
          const found = carts.get(obj.metadata?.cartId ?? '');
          if (found) created.push(buildOrderFromCart(found, { id: 'o1', email: obj.customer_email }));
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
