// Resolver for the active backend (Vendure). The same interface as backend-payload —
// so the storefront (app/(frontend)) and the catalog/cart features don't change.
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
