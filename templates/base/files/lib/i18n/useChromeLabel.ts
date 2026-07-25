// Client helper: resolve chrome copy from the locale cookie + dictionary.
'use client';

import { useEffect, useState } from 'react';
import { t, type MessageKey } from './dictionary.js';

const COOKIE = 'vitrine_locale';

function readLocale(fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : fallback;
}

/** Reactive label for header/chrome controls (updates after mount from the locale cookie). */
export function useChromeLabel(key: MessageKey, fallbackLocale = 'en'): string {
  const [label, setLabel] = useState(() => t(key, fallbackLocale));

  useEffect(() => {
    setLabel(t(key, readLocale(fallbackLocale)));
  }, [key, fallbackLocale]);

  return label;
}

export function chromeLabel(key: MessageKey, locale = 'en'): string {
  return t(key, locale);
}
