'use client';
import { useEffect, useState } from 'react';
import type { Product } from '@vitrine-kit/contracts';
import { isWishlisted, toggleWishlist } from '../../lib/wishlist/storage.js';

export interface WishlistButtonProps {
  product?: Product;
}

export function WishlistButton({ product }: WishlistButtonProps) {
  const slug = product?.slug;
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setOn(isWishlisted(slug));
    const sync = () => setOn(isWishlisted(slug));
    window.addEventListener('vitrine:wishlist', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('vitrine:wishlist', sync);
      window.removeEventListener('storage', sync);
    };
  }, [slug]);

  if (!slug) return null;

  return (
    <button
      type="button"
      className="vt-wishlist-button w-fit text-sm text-muted-fg underline underline-offset-2 transition hover:text-fg focus-visible:outline-none focus-visible:ring-2 ring-ring"
      onClick={() => setOn(toggleWishlist(slug).includes(slug))}
    >
      {on ? 'Remove from wishlist' : 'Add to wishlist'}
    </button>
  );
}
