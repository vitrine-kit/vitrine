// M10: proof of contract portability. The Vendure mappers produce the same
// contract types (Product/Category/Cart/Order) as the Payload adapter —
// meaning the catalog/cart features work on Vendure WITHOUT changes. Imported by
// relative path (like the other cross-boundary tests); depends only on the contracts.
import { describe, expect, it } from 'vitest';
import type { Cart, Product } from '@vitrine-kit/contracts';
import {
  mapOrderState,
  mapVendureCollection,
  mapVendureOrder,
  mapVendureOrderToCart,
  mapVendureProduct,
} from '../../templates/backend-vendure/files/lib/adapter/map.js';
import { formatPrice } from '../../registry/catalog/files/lib/catalog/data.js';

const vProduct = {
  id: 42,
  name: 'Classic T-Shirt',
  slug: 'classic-tee',
  description: 'A cotton T-shirt.',
  featuredAsset: { preview: 'https://cdn/asset/1.jpg', width: 600, height: 600 },
  assets: [{ preview: 'https://cdn/asset/2.jpg' }],
  collections: [{ id: 3, slug: 'apparel', name: 'Apparel' }],
  variants: [
    { id: 7, sku: 'TEE-001', name: 'M', priceWithTax: 199000, currencyCode: 'USD', stockLevel: 'IN_STOCK' },
    { id: 8, sku: 'TEE-002', name: 'L', priceWithTax: 219000, currencyCode: 'USD', stockLevel: 'IN_STOCK' },
  ],
};

const vOrder = {
  id: 100,
  code: 'ORD-1',
  state: 'PaymentSettled',
  currencyCode: 'USD',
  subTotalWithTax: 398000,
  totalWithTax: 398000,
  createdAt: '2026-06-15T00:00:00Z',
  customer: { emailAddress: 'x@y.z' },
  lines: [
    {
      id: 5,
      quantity: 2,
      unitPriceWithTax: 199000,
      linePriceWithTax: 398000,
      featuredAsset: { preview: 'https://cdn/asset/1.jpg' },
      productVariant: { id: 7, sku: 'TEE-001', name: 'T-Shirt M', product: { id: 42, slug: 'classic-tee' } },
    },
  ],
};

describe('Vendure → contract (portability)', () => {
  it('mapVendureProduct produces a Product consumed by the catalog features', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p: Product = mapVendureProduct(vProduct as any);
    expect(p.id).toBe('42'); // string id, as in the contract
    expect(p.slug).toBe('classic-tee');
    expect(p.title).toBe('Classic T-Shirt');
    expect(p.categoryIds).toEqual(['3']);
    expect(p.images.map((i) => i.url)).toEqual(['https://cdn/asset/1.jpg', 'https://cdn/asset/2.jpg']);
    expect(p.variants[0]?.currency).toBe('USD');
    expect(p.priceRange).toEqual({ min: 199000, max: 219000, currency: 'USD' });
    // the same money convention (minor units) → the same feature formatPrice
    expect(formatPrice(p.variants[0]!.price, p.variants[0]!.currency)).toContain('990');
  });

  it('mapVendureCollection → Category', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = mapVendureCollection({ id: 3, slug: 'apparel', name: 'Apparel', parent: { id: 1 } } as any);
    expect(c).toMatchObject({ id: '3', slug: 'apparel', title: 'Apparel', parentId: '1' });
  });

  it('mapVendureOrderToCart produces a Cart consumed by the cart feature', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cart: Cart = mapVendureOrderToCart(vOrder as any);
    expect(cart.id).toBe('ORD-1');
    expect(cart.currency).toBe('USD');
    expect(cart.total).toBe(398000);
    expect(cart.lines[0]).toMatchObject({
      variantId: '7',
      productId: '42',
      title: 'T-Shirt M',
      quantity: 2,
      unitPrice: 199000,
      lineTotal: 398000,
      image: 'https://cdn/asset/1.jpg',
    });
  });

  it('mapVendureOrder + mapOrderState', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const order = mapVendureOrder(vOrder as any);
    expect(order.status).toBe('paid');
    expect(order.email).toBe('x@y.z');
    expect(order.total).toBe(398000);
    expect(mapOrderState('Cancelled')).toBe('cancelled');
    expect(mapOrderState('AddingItems')).toBe('pending');
  });
});
