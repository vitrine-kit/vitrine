// Резолвер активного бэкенда для витрины. Каталог отдаём через Payload local
// API; коммерцию (CommerceBackend) включают фичи cart/checkout-stripe (M8).
import { getPayload } from 'payload';
import config from '@payload-config';
import type { CatalogSource, CommerceBackend } from '@maks417/contracts';
import { siteConfig } from '@/site.config';
import { registerPayments } from '@/lib/payments';
import { PayloadCatalogSource } from './payload-catalog.js';
import { PayloadCommerceBackend } from './payload-commerce.js';

// Регистрация платёжных провайдеров установленных фич (lib/payments.ts генерируется
// CLI). Нужна до startCheckout, который резолвит активного провайдера из реестра.
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
