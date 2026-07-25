import { describe, expect, it } from 'vitest';
import { applyProductQuery } from '../../templates/backend-payload/files/lib/adapter/product-query.js';
import type { Product } from '@vitrine-kit/contracts';

function product(partial: Partial<Product> & Pick<Product, 'id' | 'slug' | 'title'>): Product {
  return {
    categoryIds: [],
    images: [],
    variants: [{ id: 'v1', sku: 'SKU', price: 1000, currency: 'USD' }],
    ...partial,
  };
}

describe('applyProductQuery', () => {
  const catalog = [
    product({
      id: '1',
      slug: 'classic-tee',
      title: 'Classic T-Shirt',
      description: 'cotton tee',
      priceRange: { min: 2490, max: 2690, currency: 'USD' },
      variants: [
        { id: 'a', sku: 'TEE-S', price: 2490, currency: 'USD', options: { size: 'S' } },
        { id: 'b', sku: 'TEE-L', price: 2690, currency: 'USD', options: { size: 'L' } },
      ],
    }),
    product({
      id: '2',
      slug: 'logo-cap',
      title: 'Logo Cap',
      priceRange: { min: 2900, max: 2900, currency: 'USD' },
      variants: [
        { id: 'c', sku: 'CAP', price: 2900, currency: 'USD', options: { color: 'Black' } },
      ],
    }),
    product({
      id: '3',
      slug: 'zip-hoodie',
      title: 'Zip Hoodie',
      priceRange: { min: 6900, max: 7200, currency: 'USD' },
      variants: [{ id: 'd', sku: 'HOD', price: 6900, currency: 'USD', options: { size: 'M' } }],
    }),
  ];

  it('filters by search term across title/description', () => {
    const out = applyProductQuery(catalog, { search: 'cap' });
    expect(out.map((p) => p.slug)).toEqual(['logo-cap']);
  });

  it('filters by variant options', () => {
    const out = applyProductQuery(catalog, { filters: { size: ['S'] } });
    expect(out.map((p) => p.slug)).toEqual(['classic-tee']);
  });

  it('filters by price range (minor units)', () => {
    expect(applyProductQuery(catalog, { priceMax: 3000 }).map((p) => p.slug)).toEqual([
      'classic-tee',
      'logo-cap',
    ]);
    expect(applyProductQuery(catalog, { priceMin: 5000 }).map((p) => p.slug)).toEqual(['zip-hoodie']);
  });

  it('sorts by price ascending/descending', () => {
    expect(applyProductQuery(catalog, { sort: 'price-asc' }).map((p) => p.slug)).toEqual([
      'classic-tee',
      'logo-cap',
      'zip-hoodie',
    ]);
    expect(applyProductQuery(catalog, { sort: 'price-desc' }).map((p) => p.slug)).toEqual([
      'zip-hoodie',
      'logo-cap',
      'classic-tee',
    ]);
  });

  it('ranks relevance with title prefix first', () => {
    const out = applyProductQuery(catalog, { search: 'classic', sort: 'relevance' });
    expect(out[0]?.slug).toBe('classic-tee');
  });
});
