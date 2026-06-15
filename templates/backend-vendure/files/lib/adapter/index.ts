// Резолвер активного бэкенда (Vendure). Тот же интерфейс, что и backend-payload —
// поэтому витрина (app/(frontend)) и фичи каталога/корзины не меняются.
import type { CatalogSource, CommerceBackend } from '@maks417/contracts';
import { VendureCatalogSource } from './vendure-catalog.js';
import { VendureCommerceBackend } from './vendure-commerce.js';

let catalog: CatalogSource | null = null;
let commerce: CommerceBackend | null = null;

export async function getCatalogSource(): Promise<CatalogSource> {
  return (catalog ??= new VendureCatalogSource());
}

export async function getCommerceBackend(): Promise<CommerceBackend> {
  return (commerce ??= new VendureCommerceBackend(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'));
}
