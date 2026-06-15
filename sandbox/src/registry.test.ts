// Проверка реестра M3: манифесты валидны против схемы, а data-слой каталога
// работает на любом CatalogSource (доказательство переносимости через контракт).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { featureManifestSchema } from '@maks417/contracts';
import type { CatalogSource, Category, Product } from '@maks417/contracts';
import {
  formatPrice,
  loadCategories,
  loadProduct,
  loadProducts,
} from '../../registry/catalog/files/lib/catalog/data.js';

const here = dirname(fileURLToPath(import.meta.url));
const registry = resolve(here, '../../registry');
const features = ['catalog', 'product-page', 'seo', 'cart', 'checkout-stripe'];

describe('registry feature.json валидны против схемы', () => {
  for (const name of features) {
    it(name, () => {
      const json = JSON.parse(readFileSync(resolve(registry, name, 'feature.json'), 'utf8'));
      expect(() => featureManifestSchema.parse(json)).not.toThrow();
    });
  }
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
