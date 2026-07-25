// Request locale from the vitrine_locale cookie (set by i18n middleware / switcher).
import { cookies } from 'next/headers';
import { siteConfig } from '@/site.config';

export async function getRequestLocale(): Promise<string> {
  const jar = await cookies();
  const fromCookie = jar.get('vitrine_locale')?.value;
  const locales = siteConfig.i18n.locales;
  if (fromCookie && locales.includes(fromCookie)) return fromCookie;
  return siteConfig.i18n.defaultLocale;
}
