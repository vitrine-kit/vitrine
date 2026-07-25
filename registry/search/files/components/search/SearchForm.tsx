// Header search form — GET /search?q= so results are shareable and crawlable.
'use client';

import { useChromeLabel } from '@/lib/i18n/useChromeLabel';

export function SearchForm() {
  const search = useChromeLabel('search');

  return (
    <search className="vt-search-form">
      <form action="/search" method="get" className="flex items-center gap-unit">
        <label className="sr-only" htmlFor="vt-search-q">
          {search} products
        </label>
        <input
          id="vt-search-q"
          type="search"
          name="q"
          placeholder={search}
          autoComplete="off"
          className="w-28 rounded-md border border-input bg-surface px-unit py-unit text-sm text-surface-fg md:w-40 focus-visible:outline-none focus-visible:ring-2 ring-ring"
        />
        <button
          type="submit"
          className="rounded-md border border-border px-unit py-unit text-sm text-fg transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 ring-ring"
        >
          {search}
        </button>
      </form>
    </search>
  );
}
