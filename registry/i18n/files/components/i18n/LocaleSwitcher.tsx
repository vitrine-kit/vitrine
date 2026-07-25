'use client';
import { useEffect, useState } from 'react';

const COOKIE = 'vitrine_locale';

function readCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

function writeCookie(locale: string): void {
  document.cookie = `${COOKIE}=${encodeURIComponent(locale)};path=/;max-age=31536000;samesite=lax`;
}

/** Strip a leading `/{locale}` segment when present. */
function stripLocale(pathname: string, locales: string[]): string {
  const seg = pathname.split('/')[1] ?? '';
  if (locales.includes(seg)) {
    return pathname.slice(seg.length + 1) || '/';
  }
  return pathname || '/';
}

/** Locales come from site.config via optional prop; falls back to en/ru demo pair. */
export interface LocaleSwitcherProps {
  locales?: string[];
  defaultLocale?: string;
}

export function LocaleSwitcher({ locales, defaultLocale = 'en' }: LocaleSwitcherProps) {
  const options = locales && locales.length > 0 ? locales : ['en', 'ru'];
  const [locale, setLocale] = useState(defaultLocale);

  useEffect(() => {
    setLocale(readCookie() ?? defaultLocale);
  }, [defaultLocale]);

  if (options.length < 2) return null;

  return (
    <label className="vt-locale-switcher flex items-center gap-unit text-sm text-fg">
      <span className="sr-only">Language</span>
      <select
        value={locale}
        className="rounded-md border border-input bg-surface px-unit py-unit text-surface-fg focus-visible:outline-none focus-visible:ring-2 ring-ring"
        onChange={(e) => {
          const next = e.target.value;
          writeCookie(next);
          setLocale(next);
          const rest = stripLocale(location.pathname, options);
          location.assign(rest === '/' ? `/${next}` : `/${next}${rest}`);
        }}
      >
        {options.map((code) => (
          <option key={code} value={code}>
            {code.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
