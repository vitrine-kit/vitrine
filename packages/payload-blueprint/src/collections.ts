// Базовые коллекции Vitrine (нейтральная форма, переносимая в Payload-конфиг
// клиента в M5). Поля описаны контрактным BlueprintFieldDef; доп. Payload-опции
// (admin/access/hooks/upload/auth) идут через passthrough-ключи.
import type { BlueprintFieldDef } from '@maks417/contracts';

export interface BlueprintCollectionConfig {
  slug: string;
  fields: BlueprintFieldDef[];
  /** Прочие опции коллекции Payload (admin, access, hooks, upload, auth, …). */
  [option: string]: unknown;
}

const f = (
  name: string,
  type: BlueprintFieldDef['type'],
  extra: Record<string, unknown> = {},
): BlueprintFieldDef => ({ name, type, ...extra });

// Доступ только для аутентифицированных (админ): закрывает авто-сгенерированный
// публичный REST/GraphQL над корзинами/заказами. Server-local вызовы Payload
// (адаптер, webhook) идут с overrideAccess и не затрагиваются. Тип облегчён, чтобы
// не тащить payload в пакет контрактных коллекций.
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
    f('price', 'number', { required: true }), // минимальные единицы (копейки)
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
    f('paymentRef', 'text', { index: true }), // идемпотентность webhook (дедуп по референсу платежа)
    f('createdAt', 'date'),
  ],
};

export const cartsCollection: BlueprintCollectionConfig = {
  slug: 'carts',
  admin: { useAsTitle: 'id' },
  access: adminOnly,
  fields: [
    f('lines', 'json'), // CartLine[] (контракт); арифметика — в @maks417/core
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

/** Базовые коллекции в стабильном порядке. */
export const baseCollections: BlueprintCollectionConfig[] = [
  categoriesCollection,
  mediaCollection,
  usersCollection,
  productsCollection,
  variantsCollection,
  ordersCollection,
  cartsCollection,
];
