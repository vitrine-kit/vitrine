import { describe, expect, it, vi } from 'vitest';
import { isValidElement, type ComponentType, type ReactElement } from 'react';
import type { CatalogSource, CommerceBackend, SiteConfig } from '@maks417/contracts';
import { createSlotRegistry } from './slots/registry.js';
import { createAdapterRegistry, type AdapterFactory } from './adapter/resolver.js';
import { runPipeline, type OrderStage } from './order/pipeline.js';
import { handleStripeWebhook, type StripeVerifier } from './stripe/webhook.js';
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
