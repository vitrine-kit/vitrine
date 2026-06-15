// Структурные формы ответов Vendure Shop API (GraphQL). Намеренно свободные и
// НЕ импортируют сгенерированные типы Vendure — чтобы map.ts оставался чистым
// (только контракты) и тестируемым без запущенного Vendure.

export type VId = string | number;

export interface VAsset {
  preview: string;
  width?: number | null;
  height?: number | null;
}

export interface VCollection {
  id: VId;
  slug: string;
  name: string;
  description?: string | null;
  parent?: { id: VId } | null;
}

export interface VVariant {
  id: VId;
  sku: string;
  name?: string | null;
  /** Vendure хранит цену целым в минимальных единицах (как Money). */
  priceWithTax: number;
  currencyCode: string;
  stockLevel?: string | null; // 'IN_STOCK' | 'OUT_OF_STOCK' | ... (не число в Shop API)
}

export interface VProduct {
  id: VId;
  name: string;
  slug: string;
  description?: string | null;
  featuredAsset?: VAsset | null;
  assets?: VAsset[] | null;
  variants: VVariant[];
  collections?: VCollection[] | null;
}

export interface VOrderLine {
  id: VId;
  quantity: number;
  unitPriceWithTax: number;
  linePriceWithTax: number;
  featuredAsset?: VAsset | null;
  productVariant: { id: VId; sku: string; name: string; product?: { id: VId; slug?: string } | null };
}

export interface VOrder {
  id: VId;
  code: string;
  state: string;
  currencyCode: string;
  subTotalWithTax: number;
  totalWithTax: number;
  createdAt?: string;
  customer?: { emailAddress?: string | null } | null;
  lines: VOrderLine[];
}
