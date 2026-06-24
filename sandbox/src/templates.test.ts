// A check of the backend-payload template's pure critical logic without installing
// Next/Payload — the DB selection table (§18.1), Payload→contract mappers, demo-seed
// invariants and dev-procedure guards. Files are imported by relative path
// (like registry.test.ts) — proof that the logic depends only on the contracts.
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decideDbAdapter } from '../../templates/backend-payload/files/lib/adapter/db-decision.js';
import {
  mapCategory,
  mapProduct,
  richTextToPlain,
} from '../../templates/backend-payload/files/lib/adapter/map.js';
import {
  demoCategories,
  demoProducts,
} from '../../templates/backend-payload/files/lib/seed/demo.js';
import { shouldRunDevTask } from '../../templates/backend-payload/files/lib/seed/guards.js';

const here = dirname(fileURLToPath(import.meta.url));
const seedAssets = resolve(here, '../../templates/backend-payload/files/seed-assets');

describe('decideDbAdapter — table §18.1', () => {
  const base = { url: 'postgres://x', canConnect: true, isProd: false, strict: false };
  it('url + connect → postgres', () => {
    expect(decideDbAdapter(base).kind).toBe('postgres');
  });
  it('url, !connect, prod → error (never silent SQLite in prod)', () => {
    expect(decideDbAdapter({ ...base, canConnect: false, isProd: true }).kind).toBe('error');
  });
  it('url, !connect, strict in dev → error', () => {
    expect(decideDbAdapter({ ...base, canConnect: false, strict: true }).kind).toBe('error');
  });
  it('url, !connect, dev → sqlite + warn', () => {
    const d = decideDbAdapter({ ...base, canConnect: false });
    expect(d.kind).toBe('sqlite');
    expect(d.kind === 'sqlite' && d.warn).toBeTruthy();
  });
  it('no url, prod → error', () => {
    expect(decideDbAdapter({ ...base, url: null, isProd: true }).kind).toBe('error');
  });
  it('no url, dev → sqlite', () => {
    expect(decideDbAdapter({ ...base, url: null }).kind).toBe('sqlite');
  });
});

describe('Payload → contract mappers', () => {
  it('mapProduct normalizes doc + variants into Product', () => {
    const doc = {
      id: 7,
      slug: 'classic-tee',
      title: 'Classic T-Shirt',
      description: { root: { children: [{ children: [{ text: 'A cotton T-shirt.' }] }] } },
      categories: [{ id: 3, slug: 'apparel', title: 'Apparel' }],
      images: [{ id: 9, url: '/media/1.svg', alt: 'Photo' }],
      seo: { title: 'SEO', description: 'desc', image: { id: 9, url: '/media/1.svg' } },
      badge: 'new', // feature field (blueprint) → extensions
    };
    const variants = [
      { id: 1, sku: 'TEE-001', price: 199000, stock: 25 },
      { id: 2, sku: 'TEE-002', price: 259000, stock: 0 },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const product = mapProduct(doc as any, variants as any, 'USD');

    expect(product.id).toBe('7'); // id coerced to a string
    expect(product.categoryIds).toEqual(['3']);
    expect(product.images).toEqual([{ url: '/media/1.svg', alt: 'Photo' }]);
    expect(product.variants[0]?.currency).toBe('USD'); // currency injected from config
    expect(product.priceRange).toEqual({ min: 199000, max: 259000, currency: 'USD' });
    expect(product.description).toBe('A cotton T-shirt.');
    expect(product.seo?.title).toBe('SEO');
    expect(product.extensions?.badge).toBe('new');
  });

  it('mapProduct does not fail without variants or relations', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const product = mapProduct({ id: 'a', slug: 's', title: 'T' } as any, [], 'USD');
    expect(product.variants).toEqual([]);
    expect(product.images).toEqual([]);
    expect(product.priceRange).toBeUndefined();
  });

  it('mapCategory unwraps parent (id or object)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(mapCategory({ id: 1, slug: 'a', title: 'A', parent: 4 } as any).parentId).toBe('4');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(mapCategory({ id: 1, slug: 'a', title: 'A', parent: { id: 5, slug: 'p', title: 'P' } } as any).parentId).toBe('5');
  });

  it('richTextToPlain: string and Lexical', () => {
    expect(richTextToPlain('plain text')).toBe('plain text');
    expect(richTextToPlain({ root: { children: [{ children: [{ text: 'a' }, { text: 'b' }] }] } })).toBe('a b');
    expect(richTextToPlain(null)).toBeUndefined();
  });
});

describe('demo seed (§18.2) — invariants', () => {
  it('5 products, 2 categories, prices are integer minor units', () => {
    expect(demoProducts).toHaveLength(5);
    expect(demoCategories).toHaveLength(2);
    for (const p of demoProducts) {
      expect(p.image).toMatch(/^placeholder-\d\.svg$/);
      expect(demoCategories.some((c) => c.slug === p.category)).toBe(true);
      expect(p.variants.length).toBeGreaterThan(0);
      for (const v of p.variants) {
        expect(Number.isInteger(v.price)).toBe(true);
        expect(v.price).toBeGreaterThan(0);
      }
    }
  });

  it('placeholder assets for each product exist in the template (offline seed)', () => {
    for (const p of demoProducts) {
      expect(existsSync(resolve(seedAssets, p.image))).toBe(true);
    }
  });
});

describe('dev-procedure guards (§18.3)', () => {
  it('dev only + empty collection', () => {
    expect(shouldRunDevTask({ isProd: false, existingCount: 0 })).toBe(true);
    expect(shouldRunDevTask({ isProd: true, existingCount: 0 })).toBe(false);
    expect(shouldRunDevTask({ isProd: false, existingCount: 3 })).toBe(false);
  });
});
