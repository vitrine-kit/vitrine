// Сводные параметры сайта из site.config + env. Безопасно импортируется и на
// сервере, и на клиенте (только публичные значения).
import { siteConfig } from '@/site.config';

/** Базовый URL для canonical/OG. Переопределяется NEXT_PUBLIC_SITE_URL. */
export const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const currency = siteConfig.i18n.currency;
export const defaultLocale = siteConfig.i18n.defaultLocale;
export const locales = siteConfig.i18n.locales;
