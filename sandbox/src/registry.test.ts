// Registry check M3: manifests are valid against the schema, and the catalog data
// layer works on any CatalogSource (a portability proof via the contract).
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

// All registry features are directories with a feature.json. We do NOT hardcode the list:
// new features are automatically covered by validation (a broken manifest is caught in CI,
// not by the client on `vitrine add`).
const featureDirs = readdirSync(registry, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(resolve(registry, e.name, 'feature.json')))
  .map((e) => e.name)
  .sort();

describe('registry feature.json are valid against the schema', () => {
  it('registry contains features', () => {
    expect(featureDirs.length).toBeGreaterThan(0);
  });

  for (const name of featureDirs) {
    it(name, () => {
      const json = JSON.parse(readFileSync(resolve(registry, name, 'feature.json'), 'utf8'));
      expect(() => featureManifestSchema.parse(json)).not.toThrow();
      // the name in the manifest must match the directory name (the CLI resolves by it)
      expect((json as { name?: string }).name).toBe(name);
    });
  }
});

describe('registry/_index.json', () => {
  const parsed = registryIndexSchema.safeParse(
    JSON.parse(readFileSync(resolve(registry, '_index.json'), 'utf8')),
  );
  const indexFeatures = parsed.success ? Object.keys(parsed.data.features) : [];

  it('is valid against registryIndexSchema', () => {
    expect(parsed.success).toBe(true);
  });

  it('listed features exist on disk', () => {
    for (const name of indexFeatures) expect(featureDirs).toContain(name);
  });

  it('all features on disk are listed in the index', () => {
    for (const name of featureDirs) expect(indexFeatures).toContain(name);
  });
});

describe('catalog data on an in-memory CatalogSource', () => {
  const products: Product[] = [
    {
      id: '1',
      slug: 'classic-tee',
      title: 'Classic T-Shirt',
      categoryIds: ['c1'],
      images: [],
      variants: [{ id: 'v1', sku: 'TEE-001', price: 199000, currency: 'USD' }],
    },
  ];
  const categories: Category[] = [{ id: 'c1', slug: 'apparel', title: 'Apparel' }];

  const source: CatalogSource = {
    listProducts: async () => products,
    getProduct: async (slug) => products.find((p) => p.slug === slug) ?? null,
    listCategories: async () => categories,
    search: async (term) => products.filter((p) => p.title.includes(term)),
  };

  it('loadProducts / loadProduct / loadCategories', async () => {
    expect((await loadProducts(source)).length).toBe(1);
    expect((await loadProduct(source, 'classic-tee'))?.title).toBe('Classic T-Shirt');
    expect((await loadProduct(source, 'missing'))).toBeNull();
    expect((await loadCategories(source))[0]?.slug).toBe('apparel');
  });

  it('formatPrice formats minor units', () => {
    expect(formatPrice(199000, 'USD')).toContain('990');
  });
});
