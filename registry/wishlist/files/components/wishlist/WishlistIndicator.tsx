'use client';
import { useEffect, useState } from 'react';
import { readWishlist } from '../../lib/wishlist/storage.js';
import { useChromeLabel } from '@/lib/i18n/useChromeLabel';

export function WishlistIndicator() {
  const [count, setCount] = useState(0);
  const label = useChromeLabel('wishlist');

  useEffect(() => {
    const sync = () => setCount(readWishlist().length);
    sync();
    window.addEventListener('vitrine:wishlist', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('vitrine:wishlist', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return (
    <a
      href="/wishlist"
      className="vt-wishlist-indicator text-fg transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 ring-ring"
    >
      {label}
      {count > 0 ? ` (${count})` : ''}
    </a>
  );
}
