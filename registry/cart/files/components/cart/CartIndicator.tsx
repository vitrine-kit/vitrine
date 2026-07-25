// Header cart link (global.header-actions slot). Client component loads the
// item count from GET /api/cart so the kit typecheck stays free of Next imports.
'use client';
import { useEffect, useState } from 'react';
import { useChromeLabel } from '@/lib/i18n/useChromeLabel';

export function CartIndicator() {
  const [count, setCount] = useState(0);
  const label = useChromeLabel('cart');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/cart')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { lines?: Array<{ quantity?: number }> } | null) => {
        if (cancelled || !data?.lines) return;
        setCount(data.lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0));
      })
      .catch(() => {
        /* cart API missing on catalog-only installs */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <a
      href="/cart"
      className="vt-cart-indicator text-fg transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 ring-ring"
    >
      {label}
      {count > 0 ? ` (${count})` : ''}
    </a>
  );
}
