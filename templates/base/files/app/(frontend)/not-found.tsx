import type { Metadata } from 'next';
import { siteName } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Page not found',
};

export default function NotFound() {
  return (
    <div className="vt-not-found flex flex-col gap-section">
      <header className="flex flex-col gap-unit">
        <p className="text-sm text-muted-fg">404</p>
        <h1 className="font-heading text-3xl text-fg">Page not found</h1>
        <p className="max-w-prose text-muted-fg">
          That page is missing or the product is no longer available in {siteName}.
        </p>
      </header>
      <a
        href="/"
        className="w-fit rounded-md bg-primary px-gutter py-unit text-primary-fg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 ring-ring"
      >
        Back to catalog
      </a>
    </div>
  );
}
