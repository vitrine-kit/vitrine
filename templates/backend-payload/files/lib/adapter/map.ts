// Чистые мапперы Payload-документ → контрактный тип. Зависят только от
// @vitrine-kit/contracts и локальных структурных типов — поэтому типизируются и
// покрываются тестами без установленного Payload. Это критический шов
// переносимости (тот же контракт на Payload и Vendure).
import type { Category, Money, Product, ProductImage, Variant } from '@vitrine-kit/contracts';
import type { CategoryDoc, Id, MediaDoc, ProductDoc, VariantDoc } from './payload-types.js';

const asId = (v: Id): string => String(v);

const relId = (v: Id | { id: Id }): string => (typeof v === 'object' ? asId(v.id) : asId(v));

/** Известные базовые поля product — остальное уходит в Product.extensions. */
const BASE_PRODUCT_KEYS = new Set([
  'id', 'slug', 'title', 'description', 'categories', 'images', 'seo',
  'createdAt', 'updatedAt', '_status',
]);

export function mapCategory(doc: CategoryDoc): Category {
  return {
    id: asId(doc.id),
    slug: doc.slug,
    title: doc.title,
    description: doc.description ?? undefined,
    parentId: doc.parent == null ? null : relId(doc.parent),
  };
}

export function mapVariant(doc: VariantDoc, currency: string): Variant {
  return {
    id: asId(doc.id),
    sku: doc.sku,
    price: doc.price as Money,
    currency,
    stock: doc.stock ?? null,
    options: doc.options ?? undefined,
  };
}

function mapImage(m: Id | MediaDoc): ProductImage | null {
  // depth не раскрыл связь (пришёл id) или нет url — пропускаем.
  if (typeof m !== 'object' || !m.url) return null;
  return {
    url: m.url,
    alt: m.alt ?? undefined,
    width: m.width ?? undefined,
    height: m.height ?? undefined,
  };
}

/** Lexical richText (или строка) → плоский текст. Без HTML — для карточек/SEO. */
export function richTextToPlain(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value || undefined;

  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const n = node as { text?: unknown; children?: unknown; root?: unknown };
    if (typeof n.text === 'string') out.push(n.text);
    if (n.root) walk(n.root);
    if (Array.isArray(n.children)) for (const child of n.children) walk(child);
  };
  walk(value);
  const text = out.join(' ').replace(/\s+/g, ' ').trim();
  return text || undefined;
}

function collectExtensions(doc: ProductDoc): Record<string, unknown> | undefined {
  const ext: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(doc)) {
    if (!BASE_PRODUCT_KEYS.has(key) && val !== undefined) ext[key] = val;
  }
  return Object.keys(ext).length > 0 ? ext : undefined;
}

export function mapProduct(doc: ProductDoc, variants: VariantDoc[], currency: string): Product {
  const mappedVariants = variants.map((v) => mapVariant(v, currency));
  const images = (doc.images ?? [])
    .map(mapImage)
    .filter((x): x is ProductImage => x !== null);
  const categoryIds = (doc.categories ?? []).map(relId);

  const prices = mappedVariants.map((v) => v.price);
  const priceRange =
    prices.length > 0
      ? { min: Math.min(...prices), max: Math.max(...prices), currency }
      : undefined;

  const seoImage =
    doc.seo?.image && typeof doc.seo.image === 'object' ? doc.seo.image.url ?? undefined : undefined;
  const seo =
    doc.seo?.title || doc.seo?.description || seoImage
      ? {
          title: doc.seo?.title ?? undefined,
          description: doc.seo?.description ?? undefined,
          image: seoImage,
        }
      : undefined;

  return {
    id: asId(doc.id),
    slug: doc.slug,
    title: doc.title,
    description: richTextToPlain(doc.description),
    categoryIds,
    images,
    variants: mappedVariants,
    priceRange,
    seo,
    extensions: collectExtensions(doc),
  };
}
