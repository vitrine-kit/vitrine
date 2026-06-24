// Resolver for the storefront's active backend. The catalog is served via the
// Payload local API; commerce (CommerceBackend) is enabled by the cart/checkout-stripe features.
import { getPayload } from 'payload';
import config from '@payload-config';
import type { CatalogSource, CommerceBackend } from '@vitrine-kit/contracts';
import { siteConfig } from '@/site.config';
import { registerPayments } from '@/lib/payments';
import { PayloadCatalogSource } from './payload-catalog.js';
import { PayloadCommerceBackend } from './payload-commerce.js';

// Register payment providers of installed features (lib/payments.ts is generated
// by the CLI). Needed before startCheckout, which resolves the active provider from the registry.
registerPayments();

let catalog: CatalogSource | null = null;
let commerce: CommerceBackend | null = null;

export async function getCatalogSource(): Promise<CatalogSource> {
  if (catalog) return catalog;
  const payload = await getPayload({ config });
  catalog = new PayloadCatalogSource(payload, siteConfig.i18n.currency);
  return catalog;
}

export async function getCommerceBackend(): Promise<CommerceBackend> {
  if (commerce) return commerce;
  const payload = await getPayload({ config });
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  commerce = new PayloadCommerceBackend(payload, siteConfig.i18n.currency, baseUrl, siteConfig);
  return commerce;
}
