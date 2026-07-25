# Feature: search

Header search form and `/search` results page over the `CatalogSource` contract.

## Modules
- `components/search/SearchForm` — GET form → `/search?q=` (slot `global.header-actions`)
- `components/search/SearchResults` — results grid + empty state (hosts `search.*` slots)
- `lib/search/data` — `loadSearch(source, term)` via `CatalogSource.search`
- `app/(frontend)/search/page.tsx` — results page

## Contracts
`@vitrine-kit/contracts` (`CatalogSource.search`) + `@vitrine-kit/core` slots.
