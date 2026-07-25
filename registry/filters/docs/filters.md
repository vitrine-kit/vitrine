# Feature: filters

Catalog toolbar for sort, option facets, and price range via the `catalog.toolbar` slot.

## Modules
- `components/filters/CatalogToolbar` — GET form updating `?sort=`, `?size=`, `?color=`,
  `?priceMin=` / `?priceMax=` (major currency units) on the current listing URL
- Mounted into `catalog.toolbar` on home and category pages

## Contracts
- `ProductQuery.sort` (`newest` | `price-asc` | `price-desc` | `relevance`)
- `ProductQuery.filters` — option facets, e.g. `{ size: ['S'], color: ['Black'] }`
- `ProductQuery.priceMin` / `priceMax` — inclusive bounds in minor units (cents)
