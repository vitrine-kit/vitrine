// Aggregated site parameters from site.config + env. Safe to import on both
// the server and the client (public values only).
import { siteConfig } from '@/site.config';

/** Base URL for canonical/OG. Overridden by NEXT_PUBLIC_SITE_URL. */
export const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const currency = siteConfig.i18n.currency;
export const defaultLocale = siteConfig.i18n.defaultLocale;
export const locales = siteConfig.i18n.locales;
