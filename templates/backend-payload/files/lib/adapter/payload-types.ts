// Структурные формы документов Payload, как их отдаёт local API (с depth ≥ 1
// связи раскрываются в объекты). Намеренно свободные и НЕ импортируют
// сгенерированные payload-types — чтобы map.ts оставался чистым (только контракты)
// и тестируемым без Payload.

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
  /** Lexical richText (или строка). Маппится в плоский текст. */
  description?: unknown;
  categories?: Array<Id | CategoryDoc> | null;
  images?: Array<Id | MediaDoc> | null;
  seo?: ProductSeoGroup | null;
  /** Поля, добавленные фичами через blueprint extend() → Product.extensions. */
  [key: string]: unknown;
}
