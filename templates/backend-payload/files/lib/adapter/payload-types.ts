// Structural shapes of Payload documents as the local API returns them (with
// depth ≥ 1 relations expand into objects). Intentionally loose and do NOT import
// the generated payload-types — so that map.ts stays pure (contracts only)
// and testable without Payload.

export type Id = string | number;

export interface MediaDoc {
  id: Id;
  url?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface CategoryDoc {
  id: Id;
  slug: string;
  title: string;
  description?: string | null;
  parent?: Id | CategoryDoc | null;
}

export interface VariantDoc {
  id: Id;
  sku: string;
  price: number;
  stock?: number | null;
  options?: Record<string, string> | null;
  product?: Id | ProductDoc | null;
}

export interface ProductSeoGroup {
  title?: string | null;
  description?: string | null;
  image?: Id | MediaDoc | null;
}

export interface ProductDoc {
  id: Id;
  slug: string;
  title: string;
  /** Lexical richText (or string). Mapped to plain text. */
  description?: unknown;
  categories?: Array<Id | CategoryDoc> | null;
  images?: Array<Id | MediaDoc> | null;
  seo?: ProductSeoGroup | null;
  /** Fields added by features via blueprint extend() → Product.extensions. */
  [key: string]: unknown;
}
