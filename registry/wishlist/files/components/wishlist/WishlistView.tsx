'use client';
import { useEffect, useState } from 'react';
import { readWishlist, writeWishlist } from '../../lib/wishlist/storage.js';

interface WishItem {
  slug: string;
  title?: string;
}

export function WishlistView() {
  const [items, setItems] = useState<WishItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const slugs = readWishlist();
    if (slugs.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    Promise.all(
      slugs.map(async (slug) => {
        try {
          const res = await fetch(`/api/products?where[slug][equals]=${encodeURIComponent(slug)}&limit=1`);
          if (!res.ok) return { slug };
          const data = (await res.json()) as { docs?: Array<{ title?: string }> };
          return { slug, title: data.docs?.[0]?.title };
        } catch {
          return { slug };
        }
      }),
    ).then((list) => {
      setItems(list);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-muted-fg">Loading wishlist…</p>;

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-gutter">
        <p className="text-muted-fg">Your wishlist is empty.</p>
        <a href="/" className="w-fit text-fg underline underline-offset-2">
          Browse catalog
        </a>
      </div>
    );
  }

  return (
    <ul role="list" className="flex flex-col gap-gutter">
      {items.map((item) => (
        <li key={item.slug} className="flex items-center justify-between gap-gutter border-b border-border py-unit">
          <a href={`/products/${item.slug}`} className="text-fg underline-offset-2 hover:underline">
            {item.title ?? item.slug}
          </a>
          <button
            type="button"
            className="text-sm text-muted-fg underline underline-offset-2 hover:text-fg"
            onClick={() => {
              const next = readWishlist().filter((s) => s !== item.slug);
              writeWishlist(next);
              setItems((prev) => prev.filter((p) => p.slug !== item.slug));
            }}
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
