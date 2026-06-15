// M5: проверка чистой критической логики шаблона backend-payload без установки
// Next/Payload — таблица выбора БД (§18.1), мапперы Payload→контракт, инварианты
// демо-сида и гарды dev-процедур. Файлы импортируются по относительному пути
// (как registry.test.ts) — доказательство, что логика зависит только от контрактов.
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

describe('decideDbAdapter — таблица §18.1', () => {
  const base = { url: 'postgres://x', canConnect: true, isProd: false, strict: false };
  it('url + connect → postgres', () => {
    expect(decideDbAdapter(base).kind).toBe('postgres');
  });
  it('url, !connect, prod → error (никогда молча SQLite на проде)', () => {
    expect(decideDbAdapter({ ...base, canConnect: false, isProd: true }).kind).toBe('error');
  });
  it('url, !connect, strict в dev → error', () => {
    expect(decideDbAdapter({ ...base, canConnect: false, strict: true }).kind).toBe('error');
  });
  it('url, !connect, dev → sqlite + warn', () => {
    const d = decideDbAdapter({ ...base, canConnect: false });
    expect(d.kind).toBe('sqlite');
    expect(d.kind === 'sqlite' && d.warn).toBeTruthy();
  });
  it('нет url, prod → error', () => {
    expect(decideDbAdapter({ ...base, url: null, isProd: true }).kind).toBe('error');
  });
  it('нет url, dev → sqlite', () => {
    expect(decideDbAdapter({ ...base, url: null }).kind).toBe('sqlite');
  });
});

describe('мапперы Payload → контракт', () => {
  it('mapProduct нормализует doc + variants в Product', () => {
    const doc = {
      id: 7,
      slug: 'classic-tee',
      title: 'Классическая футболка',
      description: { root: { children: [{ children: [{ text: 'Хлопковая футболка.' }] }] } },
      categories: [{ id: 3, slug: 'apparel', title: 'Одежда' }],
      images: [{ id: 9, url: '/media/1.svg', alt: 'Фото' }],
      seo: { title: 'SEO', description: 'desc', image: { id: 9, url: '/media/1.svg' } },
      badge: 'new', // поле фичи (blueprint) → extensions
    };
    const variants = [
      { id: 1, sku: 'TEE-001', price: 199000, stock: 25 },
      { id: 2, sku: 'TEE-002', price: 259000, stock: 0 },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const product = mapProduct(doc as any, variants as any, 'RUB');

    expect(product.id).toBe('7'); // id приведён к строке
    expect(product.categoryIds).toEqual(['3']);
    expect(product.images).toEqual([{ url: '/media/1.svg', alt: 'Фото' }]);
    expect(product.variants[0]?.currency).toBe('RUB'); // валюта инжектится из config
    expect(product.priceRange).toEqual({ min: 199000, max: 259000, currency: 'RUB' });
    expect(product.description).toBe('Хлопковая футболка.');
    expect(product.seo?.title).toBe('SEO');
    expect(product.extensions?.badge).toBe('new');
  });

  it('mapProduct без вариантов и связей не падает', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const product = mapProduct({ id: 'a', slug: 's', title: 'T' } as any, [], 'USD');
    expect(product.variants).toEqual([]);
    expect(product.images).toEqual([]);
    expect(product.priceRange).toBeUndefined();
  });

  it('mapCategory разворачивает parent (id или объект)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(mapCategory({ id: 1, slug: 'a', title: 'A', parent: 4 } as any).parentId).toBe('4');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(mapCategory({ id: 1, slug: 'a', title: 'A', parent: { id: 5, slug: 'p', title: 'P' } } as any).parentId).toBe('5');
  });

  it('richTextToPlain: строка и Lexical', () => {
    expect(richTextToPlain('просто текст')).toBe('просто текст');
    expect(richTextToPlain({ root: { children: [{ children: [{ text: 'a' }, { text: 'b' }] }] } })).toBe('a b');
    expect(richTextToPlain(null)).toBeUndefined();
  });
});

describe('демо-сид (§18.2) — инварианты', () => {
  it('5 товаров, 2 категории, цены — целые минимальные единицы', () => {
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

  it('placeholder-ассеты каждого товара существуют в шаблоне (офлайн-сид)', () => {
    for (const p of demoProducts) {
      expect(existsSync(resolve(seedAssets, p.image))).toBe(true);
    }
  });
});

describe('гарды dev-процедур (§18.3)', () => {
  it('только dev + пустая коллекция', () => {
    expect(shouldRunDevTask({ isProd: false, existingCount: 0 })).toBe(true);
    expect(shouldRunDevTask({ isProd: true, existingCount: 0 })).toBe(false);
    expect(shouldRunDevTask({ isProd: false, existingCount: 3 })).toBe(false);
  });
});
