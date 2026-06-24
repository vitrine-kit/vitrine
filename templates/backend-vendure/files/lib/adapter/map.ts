// Pure mappers from Vendure Shop API → contract types. They depend only on
// @vitrine-kit/contracts and local structural types. This is the proof of
// portability: the same Product/Category/Cart/Order types the Payload adapter returns
// — meaning the catalog/cart features work on Vendure WITHOUT changes.
import type { Cart, Category, Money, Order, OrderStatus, Product, Variant } from '@vitrine-kit/contracts';
import type { VAsset, VCollection, VOrder, VProduct, VVariant } from './vendure-types.js';

const asId = (v: string | number): string => String(v);

export function mapVendureCollection(c: VCollection): Category {
  return {
    id: asId(c.id),
    slug: c.slug,
    title: c.name,
    description: c.description ?? undefined,
    parentId: c.parent ? asId(c.parent.id) : null,
  };
}

function mapVariant(v: VVariant): Variant {
  return {
    id: asId(v.id),
    sku: v.sku,
    title: v.name ?? undefined,
    price: v.priceWithTax as Money,
    currency: v.currencyCode,
    stock: null, // the Shop API returns stockLevel as a string — we don't track numeric stock here
  };
}

export function mapVendureProduct(p: VProduct): Product {
  const variants = p.variants.map(mapVariant);
  const assets = [p.featuredAsset, ...(p.assets ?? [])].filter((a): a is VAsset => a != null);
  const images = assets.map((a) => ({ url: a.preview, width: a.width ?? undefined, height: a.height ?? undefined }));
  const prices = variants.map((v) => v.price);
  const currency = variants[0]?.currency ?? 'USD';

  return {
    id: asId(p.id),
    slug: p.slug,
    title: p.name,
    description: p.description ?? undefined,
    categoryIds: (p.collections ?? []).map((c) => asId(c.id)),
    images,
    variants,
    priceRange: prices.length > 0 ? { min: Math.min(...prices), max: Math.max(...prices), currency } : undefined,
  };
}

/** Vendure order state → contract OrderStatus. */
export function mapOrderState(state: string): OrderStatus {
  switch (state) {
    case 'PaymentSettled':
    case 'PaymentAuthorized':
      return 'paid';
    case 'Shipped':
    case 'Delivered':
    case 'Fulfilled':
      return 'fulfilled';
    case 'Cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

/** Active Vendure order → Cart (the same the cart feature gets on Payload). */
export function mapVendureOrderToCart(o: VOrder): Cart {
  return {
    id: o.code,
    currency: o.currencyCode,
    subtotal: o.subTotalWithTax,
    total: o.totalWithTax,
    lines: o.lines.map((l) => ({
      id: asId(l.id),
      variantId: asId(l.productVariant.id),
      productId: l.productVariant.product ? asId(l.productVariant.product.id) : '',
      title: l.productVariant.name,
      quantity: l.quantity,
      unitPrice: l.unitPriceWithTax,
      lineTotal: l.linePriceWithTax,
      image: l.featuredAsset?.preview,
    })),
  };
}

export function mapVendureOrder(o: VOrder): Order {
  const cart = mapVendureOrderToCart(o);
  return {
    id: asId(o.id),
    number: o.code,
    status: mapOrderState(o.state),
    lines: cart.lines.map((l) => ({
      variantId: l.variantId,
      productId: l.productId,
      title: l.title,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
    })),
    currency: o.currencyCode,
    subtotal: o.subTotalWithTax,
    total: o.totalWithTax,
    email: o.customer?.emailAddress ?? undefined,
    createdAt: o.createdAt ?? new Date().toISOString(),
  };
}
