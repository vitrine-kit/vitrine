// Vitrine's base collections (a neutral form, ported into the client's Payload
// config). Fields are described by the contract BlueprintFieldDef; extra Payload options
// (admin/access/hooks/upload/auth) go through passthrough keys.
import type { BlueprintFieldDef } from '@vitrine-kit/contracts';

export interface BlueprintCollectionConfig {
  slug: string;
  fields: BlueprintFieldDef[];
  /** Other Payload collection options (admin, access, hooks, upload, auth, …). */
  [option: string]: unknown;
}

const f = (
  name: string,
  type: BlueprintFieldDef['type'],
  extra: Record<string, unknown> = {},
): BlueprintFieldDef => ({ name, type, ...extra });

// Authenticated-only (admin) access: locks down the auto-generated
// public REST/GraphQL over carts/orders. Server-local Payload calls
// (adapter, webhook) use overrideAccess and aren't affected. The type is loosened so we
// don't pull payload into the contract-collections package.
const authenticated = ({ req }: { req?: { user?: unknown } }): boolean => Boolean(req?.user);
const adminOnly = { read: authenticated, create: authenticated, update: authenticated, delete: authenticated };

export const categoriesCollection: BlueprintCollectionConfig = {
  slug: 'categories',
  admin: { useAsTitle: 'title' },
  fields: [
    f('title', 'text', { required: true }),
    f('slug', 'text', { required: true, unique: true, index: true }),
    f('description', 'textarea'),
    f('parent', 'relationship', { relationTo: 'categories' }),
  ],
};

export const mediaCollection: BlueprintCollectionConfig = {
  slug: 'media',
  upload: true,
  fields: [f('alt', 'text')],
};

export const usersCollection: BlueprintCollectionConfig = {
  slug: 'users',
  auth: true,
  fields: [f('email', 'text', { required: true })],
};

export const variantsCollection: BlueprintCollectionConfig = {
  slug: 'variants',
  admin: { useAsTitle: 'sku' },
  fields: [
    f('sku', 'text', { required: true, unique: true, index: true }),
    f('product', 'relationship', { relationTo: 'products', required: true }),
    f('price', 'number', { required: true }), // minor units (e.g. cents)
    f('stock', 'number'),
    f('options', 'json'), // { size: 'M', color: 'red' }
  ],
};

export const productsCollection: BlueprintCollectionConfig = {
  slug: 'products',
  admin: { useAsTitle: 'title' },
  fields: [
    f('title', 'text', { required: true }),
    f('slug', 'text', { required: true, unique: true, index: true }),
    f('description', 'richText'),
    f('categories', 'relationship', { relationTo: 'categories', hasMany: true }),
    f('images', 'relationship', { relationTo: 'media', hasMany: true }),
    f('seo', 'group', {
      fields: [f('title', 'text'), f('description', 'textarea'), f('image', 'relationship', { relationTo: 'media' })],
    }),
  ],
};

export const ordersCollection: BlueprintCollectionConfig = {
  slug: 'orders',
  admin: { useAsTitle: 'id' },
  access: adminOnly,
  fields: [
    f('status', 'select', {
      options: ['pending', 'paid', 'fulfilled', 'cancelled', 'refunded'],
      defaultValue: 'pending',
    }),
    f('email', 'text'),
    f('currency', 'text'),
    f('subtotal', 'number'),
    f('total', 'number'),
    f('lines', 'json'),
    f('paymentProvider', 'text'), // 'stripe' | 'paddle' | 'yookassa'
    f('paymentRef', 'text', { index: true }), // webhook idempotency (dedup by payment reference)
    f('createdAt', 'date'),
  ],
};

export const cartsCollection: BlueprintCollectionConfig = {
  slug: 'carts',
  admin: { useAsTitle: 'id' },
  access: adminOnly,
  fields: [
    f('lines', 'json'), // CartLine[] (contract); arithmetic lives in @vitrine-kit/core
    f('currency', 'text'),
    f('subtotal', 'number'),
    f('discountTotal', 'number'),
    f('total', 'number'),
    f('status', 'select', {
      options: ['active', 'converted', 'abandoned'],
      defaultValue: 'active',
    }),
    f('paymentRef', 'text', { index: true }),
  ],
};

/** Base collections in a stable order. */
export const baseCollections: BlueprintCollectionConfig[] = [
  categoriesCollection,
  mediaCollection,
  usersCollection,
  productsCollection,
  variantsCollection,
  ordersCollection,
  cartsCollection,
];
