# @vitrine-kit/vitrine

## 0.3.1

### Patch Changes

- 610d52e: English-only product: all user-facing text is now English. The CLI's output and the
  artifacts it generates into the client repo (`README.md`, `CLAUDE.md`, `.env.example`,
  `.claude/commands/*`, `AGENTS.md`) are in English, as are runtime error messages across
  `@vitrine-kit/core` and `@vitrine-kit/payload-blueprint`, and the demo seed (English
  products/categories). The default `site.config` i18n is now `defaultLocale: 'en'`,
  `locales: ['en']`, `currency: 'USD'` (previously `ru`/`['ru']`/`'RUB'`) — explicit values
  in an existing client's `site.config` are unaffected.
- Updated dependencies [610d52e]
  - @vitrine-kit/contracts@1.2.0

## 0.3.0

### Minor Changes

- 9d4ae82: Move to the `vitrine-kit` organization: packages renamed from the `@maks417/*` scope to
  `@vitrine-kit/*` and published to the **public npm** (npmjs.com, with provenance) instead of private
  GitHub Packages. License — **MIT**. Installation no longer requires a token/PAT: not for client repos,
  not for CI, not for the Docker build. Inside the monorepo packages are still linked via `workspace:*`.

### Patch Changes

- Updated dependencies [9d4ae82]
  - @vitrine-kit/contracts@1.1.0

## 0.2.0

### Minor Changes

- 29f419a: init now scaffolds agent artifacts into the client repository, so the project can be driven by
  an AI agent: an extended `CLAUDE.md` (full CLI command reference + typical scenarios + boundaries),
  Claude Code slash commands in `.claude/commands/` (`/setup`, `/add-feature`, `/design`, `/update`,
  `/doctor`) and `AGENTS.md` for cross-tool agents. The CLI README is expanded into a getting-started.

## 0.1.2

### Patch Changes

- 9cf0098: init generates the client's `README.md` (backend-aware) instead of a static template file.
  The README covers the developer's whole workflow — run/deploy for the chosen backend
  (Payload: `/admin` + `PAYLOAD_SECRET`; Vendure: `pnpm vendure` + the Shop API `:3001` +
  `VENDURE_*`), as well as the feature and update lifecycle (`add`/`remove`/`list`,
  `update`/`diff`, `doctor`, `kit update`) and the independent upgrade of the `@vitrine-kit/*` packages.
  Fixes a bug: the previous static README was Payload-specific and ended up in a Vendure project.

## 0.1.1

### Patch Changes

- b7b4590: CLI: `vitrine --version` now reads the version from package.json at runtime instead of a hardcoded `0.0.0` (which diverged from the package's release version).

## 0.1.0

### Minor Changes

- fc9cb9b: M6: `vitrine design apply` — the AI design step as a **wrapper around Claude Code** (§11).
  The CLI has no Anthropic integration of its own: it locates the `claude` binary (--bin /
  VITRINE_CLAUDE_BIN / PATH; a clear error with an install hint if not found),
  builds the prompt from the "INSTRUCTION: apply the design from /design" block in CLAUDE.md +
  the closed token set + a pointer to the single editable file
  `theme/client.css`, and shells out to Claude Code (`-p`, `--permission-mode acceptEdits`)
  with the project cwd. Guards: an empty `design/` → a clear error; `--dry-run` shows
  the command without running it. The hard §11 constraints (tokens only, not behavior/data/
  routing/a11y) live in the prompt; the step is idempotent.
- 65062d9: M4: the feature install primitive + the `init`/`add`/`list`/`remove` commands. The primitive is
  shared by init and add (the 7 steps of §9: resolve registry dependencies → copy
  files → flag in site.config → slots → blueprint → env+npm → vitrine.json +
  CLAUDE.md). Idempotent, transactional (rollback on error), snapshots
  pristine originals into `.vitrine/originals` (the basis for 3-way merge, M9). `init`
  creates a minimal client skeleton (full Next/Payload templates — M5).
- fc9cb9b: M7: `vitrine kit update` / `kit status` / `self-update` + `vitrine doctor`.
  `kit update` fills the `~/.vitrine` cache (registry + templates) from a GitHub release
  (via `gh`) or from a local tree (`--from <dir>`, offline); prints a changelog
  (the diff of feature sets) and writes `kit.json`. After update, `init`/`add` work offline
  from the cache (`VITRINE_HOME`/`~/.vitrine` is resolved automatically). `doctor` checks
  four axes of consistency in the client repository — `vitrine.json` ↔ files ↔ packages
  (`package.json`) ↔ env (`.env.example`) + slots/flags/design instruction — and for
  each discrepancy offers a fix (exits with code 1 on an error level).
- fc9cb9b: M5: `init` scaffolds from the `templates/base` + `templates/backend-payload` templates
  (Next.js + Tailwind + Payload 3) on top of the same install primitive. The template provides
  a static skeleton (storefront routes, the Payload admin, adapters, zero-config dev —
  SQLite fallback + demo seed + dev admin §18, Dockerfile + docker-compose for a VPS);
  the CLI generates the managed files (site.config, vitrine.json, CLAUDE.md,
  package.json with the Next/Payload stack, slots/blueprint/theme). A real
  `PayloadCatalogSource` on top of the `CatalogSource` contract; the pure mappers and the
  DB selection logic are covered by tests and `typecheck:templates`.
- fc9cb9b: M9: `vitrine update [feature…]` (3-way merge) + `vitrine diff <feature>`. A line-by-line
  diff3 (`merge.ts`, no dependencies): base = the pristine original of the version
  (`.vitrine/originals`, laid down by the primitive since M4), ours = the client repo
  (styled), theirs = the version from the registry. A clean merge is silent, an unresolvable one —
  git markers (`<<<<<<< / ======= / >>>>>>>`). `applyUpdate` writes the merged files,
  updates the pristine snapshot to the new version, bumps `vitrine.json` and regenerates
  the derived files. `diff` = the same plan in dry-run. `update` without arguments walks all
  installed features; `--dry-run` shows the plan without writing.
- fc9cb9b: M10: the Vendure backend → a full store. `vitrine init --tier full-store` (default backend
  vendure) assembles the `templates/backend-vendure` template: a Vendure server
  (`vendure-config.ts` — Postgres / SQLite-dev §18 equivalent, superadmin from env),
  the `VendureCatalogSource`/`VendureCommerceBackend` adapters on top of the Shop GraphQL,
  a populate guard (dev only + empty DB), Docker (db + server + web). The storefront
  (`app/(frontend)`) and the catalog/cart features are the same as on Payload: a proof of
  contract portability (on vendure `checkout-stripe` is excluded from the auto set —
  payment is native Vendure-Stripe). The pure Vendure→contract mappers are covered by tests and
  `typecheck:templates`. ⚠ A legal review of the Vendure license (GPL-3.0) is a separate track.
- d340824: Provider-agnostic payments. `@vitrine-kit/core` gains a `PaymentProvider` abstraction

  - the `payments` registry (mirror of adapter/resolver) and a neutral `handlePaymentWebhook`;
    the Stripe-specific `handleStripeWebhook`/`cartToStripeLineItems` are removed from the core
    (they move into the `checkout-stripe` feature). `OrderCreationGuard` is generalized:
    `sessionId`→`providerRef`, `existingOrderSessionIds`→`existingOrderRefs`.

  `@vitrine-kit/contracts`: `integrations.payments` → `stripe | paddle | yookassa`;
  the feature manifest gains a `payment: { provider }` block.

  `@vitrine-kit/payload-blueprint`: the `orders.stripeSessionId`/`carts.stripeSessionId` fields
  are renamed to `paymentRef`, and `orders` gains `paymentProvider`.

  `@vitrine-kit/vitrine` (CLI): generates `lib/payments.ts` (provider registration) and
  sets the active provider in `site.config` when a `checkout-<provider>` feature is installed.

### Patch Changes

- Updated dependencies [65062d9]
- Updated dependencies [d340824]
  - @vitrine-kit/contracts@1.0.0
