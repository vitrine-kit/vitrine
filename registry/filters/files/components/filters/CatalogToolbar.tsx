// Catalog listing toolbar — sort + option facets + price range. Uses GET so
// listings stay shareable.
'use client';

export interface CatalogToolbarProps {
  /** Current sort value from the page query string. */
  sort?: string;
  /** Form action (pathname). Defaults to "/". */
  action?: string;
  /** Available option facets from the current catalog slice. */
  facets?: Record<string, string[]>;
  /** Currently selected option filters. */
  filters?: Record<string, string[]>;
  /** Minor-unit price bounds (string so uncontrolled inputs stay simple). */
  priceMin?: string;
  priceMax?: string;
}

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];

export function CatalogToolbar({
  sort = 'newest',
  action = '/',
  facets = {},
  filters = {},
  priceMin = '',
  priceMax = '',
}: CatalogToolbarProps) {
  const facetEntries = Object.entries(facets).filter(([, values]) => values.length > 0);

  return (
    <form
      action={action}
      method="get"
      className="vt-catalog-toolbar flex flex-col gap-gutter"
    >
      <div className="flex flex-wrap items-end gap-gutter">
        <label className="flex items-center gap-unit text-sm text-fg">
          <span className="text-muted-fg">Sort</span>
          <select
            name="sort"
            defaultValue={sort}
            className="rounded-md border border-input bg-surface px-gutter py-unit text-surface-fg focus-visible:outline-none focus-visible:ring-2 ring-ring"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-unit text-sm text-fg">
          <span className="text-muted-fg">Min $</span>
          <input
            type="number"
            name="priceMin"
            min={0}
            step={0.01}
            defaultValue={priceMin}
            placeholder="0"
            className="w-24 rounded-md border border-input bg-surface px-gutter py-unit text-surface-fg focus-visible:outline-none focus-visible:ring-2 ring-ring"
          />
        </label>
        <label className="flex items-center gap-unit text-sm text-fg">
          <span className="text-muted-fg">Max $</span>
          <input
            type="number"
            name="priceMax"
            min={0}
            step={0.01}
            defaultValue={priceMax}
            placeholder="—"
            className="w-24 rounded-md border border-input bg-surface px-gutter py-unit text-surface-fg focus-visible:outline-none focus-visible:ring-2 ring-ring"
          />
        </label>

        <button
          type="submit"
          className="rounded-md border border-border px-gutter py-unit text-sm text-fg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 ring-ring"
        >
          Apply
        </button>
      </div>

      {facetEntries.length > 0 ? (
        <div className="flex flex-wrap gap-section">
          {facetEntries.map(([key, values]) => (
            <fieldset key={key} className="flex flex-col gap-unit">
              <legend className="text-sm capitalize text-muted-fg">{key}</legend>
              <div className="flex flex-wrap gap-gutter">
                {values.map((value) => {
                  const checked = Boolean(filters[key]?.includes(value));
                  return (
                    <label
                      key={value}
                      className="flex items-center gap-unit text-sm text-fg"
                    >
                      <input
                        type="checkbox"
                        name={key}
                        value={value}
                        defaultChecked={checked}
                        className="rounded border-input"
                        onChange={(e) => e.currentTarget.form?.requestSubmit()}
                      />
                      {value}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      ) : null}
    </form>
  );
}
