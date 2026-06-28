# templates/ — client repository skeletons

`vitrine init` assembles the client repository from these (spec §6). `templates/<name>/files`
**mirrors the client root** (like `registry/<feature>/files`): the static skeleton is copied as-is,
then the CLI generates managed files on top of it (site.config.ts, vitrine.json, CLAUDE.md,
package.json, lib/slots.ts, lib/payments.ts, lib/blueprint.ts, theme/client.css).

- `base` — Next.js (App Router, route group `(frontend)`) + Tailwind (Vitrine preset),
  storefront routes (home/catalog, product, category), header/footer hosting slots,
  `.gitignore` (with `.vitrine/`), `/design` README.
- `backend-payload` — Payload config, the `(payload)` admin, a `PayloadCatalogSource`
  adapter over the `CatalogSource` contract, zero-config dev
  (SQLite fallback + demo seed + dev admin, §18), `Dockerfile` + `docker-compose.yml`
  (app + Postgres, VPS hosting target).
- `backend-vendure` — A Vendure server (`vendure-config.ts`, Postgres/SQLite-dev db,
  superadmin from env), `VendureCatalogSource`/`VendureCommerceBackend` adapters over the Shop
  GraphQL API, a populate guard (§18 equivalent), `Dockerfile` + `docker-compose.yml` (db + server + web).
  The storefront (`app/(frontend)`) and the catalog/cart features are the same as on Payload
  (portability via contracts). Full payments use the Vendure Stripe plugin; the GPL-3.0 legal review
  is a separate track.

## What is checked in the monorepo

Template files that depend on Next/Payload are typechecked **when the client is instantiated**
(the stack is installed there). The pure critical logic (Payload→contract mappers, the §18.1 DB
selection table, demo-seed invariants, dev-procedure guards) depends only on the contracts and is
covered by `pnpm typecheck:templates` + tests in `sandbox/`.
