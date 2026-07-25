// Product gallery — client component so thumbnails switch the cover image.
'use client';
import { useState } from 'react';
import type { ProductImage } from '@vitrine-kit/contracts';

export interface ProductGalleryProps {
  images: ProductImage[];
  title: string;
}

export function ProductGallery({ images, title }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const cover = images[active] ?? images[0];
  if (!cover) {
    return <div className="aspect-square w-full rounded-md bg-muted" aria-hidden="true" />;
  }

  return (
    <div className="vt-product-gallery">
      <img
        src={cover.url}
        alt={cover.alt ?? title}
        className="w-full rounded-md object-cover"
      />
      {images.length > 1 ? (
        <ul role="list" className="mt-gutter flex gap-gutter">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === active ? 'true' : undefined}
                className={`rounded-md focus-visible:outline-none focus-visible:ring-2 ring-ring ${
                  i === active ? 'ring-2 ring-ring' : 'opacity-80 hover:opacity-100'
                }`}
              >
                <img
                  src={img.url}
                  alt={img.alt ?? `${title} — image ${i + 1}`}
                  className="h-16 w-16 rounded-md object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
