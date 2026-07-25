// Locale path middleware: when site.config has multiple locales, prefix URLs
// (`/en/cart`) and rewrite internally to the unprefixed App Router tree.
// No-op when only one locale is configured.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { siteConfig } from './site.config';

const COOKIE = 'vitrine_locale';

export function middleware(req: NextRequest) {
  const locales = siteConfig.i18n.locales;
  const defaultLocale = siteConfig.i18n.defaultLocale;
  if (locales.length < 2) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Skip Next internals, Payload admin/API, and static assets.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/admin') ||
    pathname.includes('.') // files with extensions
  ) {
    return NextResponse.next();
  }

  const seg = pathname.split('/')[1] ?? '';
  const hasLocale = locales.includes(seg);

  if (!hasLocale) {
    const cookieLocale = req.cookies.get(COOKIE)?.value;
    const locale = cookieLocale && locales.includes(cookieLocale) ? cookieLocale : defaultLocale;
    const url = req.nextUrl.clone();
    url.pathname = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`;
    const res = NextResponse.redirect(url);
    res.cookies.set(COOKIE, locale, { path: '/', maxAge: 31536000, sameSite: 'lax' });
    return res;
  }

  const locale = seg;
  const stripped = pathname.slice(locale.length + 1) || '/';
  const rewrite = req.nextUrl.clone();
  rewrite.pathname = stripped;
  const res = NextResponse.rewrite(rewrite);
  res.cookies.set(COOKIE, locale, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
