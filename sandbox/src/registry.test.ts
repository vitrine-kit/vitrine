// Проверка реестра M3: манифесты валидны против схемы, а data-слой каталога
// работает на любом CatalogSource (доказательство переносимости через контракт).
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { featureManifestSchema, registryIndexSchema } from '@vitrine-kit/contracts';
import type { CatalogSource, Category, Product } from '@vitrine-kit/contracts';
import {
  formatPrice,
  loadCategories,
  loadProduct,
  loadProducts,
} from '../../registry/catalog/files/lib/catalog/data.js';

const here = dirname(fileURLToPath(import.meta.url));
const registry = resolve(here, '../../registry');

// Все фичи реестра — каталоги с feature.json. Список НЕ хардкодим: новые фичи
// автоматически попадают под валидацию (битый манифест ловится в CI, а не у
// клиента на `vitrine add`).
const featureDirs = readdirSync(registry, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(resolve(registry, e.name, 'feature.json')))
  .map((e) => e.name)
  .sort();

describe('registry feature.json валидны против схемы', () => {
  it('реестр содержит фичи', () => {
    expect(featureDirs.length).toBeGreaterThan(0);
  });

  for (const name of featureDirs) {
    it(name, () => {
      const json = JSON.parse(readFileSync(resolve(registry, name, 'feature.json'), 'utf8'));
      expect(() => featureManifestSchema.parse(json)).not.toThrow();
      // имя в манифесте обязано совпадать с именем каталога (CLI резолвит по нему)
      expect((json as { name?: string }).name).toBe(name);
    });
  }
});

describe('registry/_index.json', () => {
  const parsed = registryIndexSchema.safeParse(
    JSON.parse(readFileSync(resolve(registry, '_index.json'), 'utf8')),
  );
  const indexFeatures = parsed.success ? Object.keys(parsed.data.features) : [];

  it('валиден против registryIndexSchema', () => {
    expect(parsed.success).toBe(true);
  });

  it('перечисленные фичи существуют на диске', () => {
    for (const name of indexFeatures) expect(featureDirs).toContain(name);
  });

  it('все фичи на диске перечислены в индексе', () => {
    for (const name of featureDirs) expect(indexFeatures).toContain(name);
  });
});

describe('catalog data на in-memory CatalogSource', () => {
  const products: Product[] = [
    {
      id: '1',
      slug: 'classic-tee',
      title: 'Классическая футболка',
      categoryIds: ['c1'],
      images: [],
      variants: [{ id: 'v1', sku: 'TEE-001', price: 199000, currency: 'RUB' }],
    },
  ];
  const categories: Category[] = [{ id: 'c1', slug: 'apparel', title: 'Одежда' }];

  const source: CatalogSource = {
    listProducts: async () => products,
    getProduct: async (slug) => products.find((p) => p.slug === slug) ?? null,
    listCategories: async () => categories,
    search: async (term) => products.filter((p) => p.title.includes(term)),
  };

  it('loadProducts / loadProduct / loadCategories', async () => {
    expect((await loadProducts(source)).length).toBe(1);
    expect((await loadProduct(source, 'classic-tee'))?.title).toBe('Классическая футболка');
    expect((await loadProduct(source, 'missing'))).toBeNull();
    expect((await loadCategories(source))[0]?.slug).toBe('apparel');
  });

  it('formatPrice форматирует минимальные единицы', () => {
    expect(formatPrice(199000, 'RUB')).toContain('990');
  });
});
