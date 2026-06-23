// Резолвер активного бэкенда (Vendure). Тот же интерфейс, что и backend-payload —
// поэтому витрина (app/(frontend)) и фичи каталога/корзины не меняются.
import type { CatalogSource, CommerceBackend } from '@vitrine-kit/contracts';
import { VendureCatalogSource } from './vendure-catalog.js';
import { VendureCommerceBackend } from './vendure-commerce.js';

let catalog: CatalogSource | null = null;
let commerce: CommerceBackend | null = null;

export async function getCatalogSource(): Promise<CatalogSource> {
  if (!catalog) catalog = new VendureCatalogSource();
  return catalog;
}

export async function getCommerceBackend(): Promise<CommerceBackend> {
  if (!commerce) {
    commerce = new VendureCommerceBackend(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
  }
  return commerce;
}
