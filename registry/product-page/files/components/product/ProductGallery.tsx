// Product gallery — presentational, neutral.
import type { ProductImage } from '@vitrine-kit/contracts';

export interface ProductGalleryProps {
  images: ProductImage[];
  title: string;
}

export function ProductGallery({ images, title }: ProductGalleryProps) {
  const cover = images[0];
  if (!cover) {
    return <div className="aspect-square w-full rounded-md bg-muted" aria-hidden="true" />;
  }
  const rest = images.slice(1);
  return (
    <div className="vt-product-gallery">
      <img
        src={cover.url}
        alt={cover.alt ?? title}
        className="w-full rounded-md object-cover"
      />
      {rest.length > 0 ? (
        <ul role="list" className="mt-gutter flex gap-gutter">
          {rest.map((img, i) => (
            <li key={img.url}>
              <img
                src={img.url}
                alt={img.alt ?? `${title} — image ${i + 2}`}
                className="h-16 w-16 rounded-md object-cover"
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
