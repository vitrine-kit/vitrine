# @vitrine-kit/contracts

## 1.3.0

### Minor Changes

- 7c95387: Docker compose first-boot seed/admin, Payload CMS locales for product copy, console email adapter for password reset, and catalog option/price facets.
- 7c95387: Close the highest-impact simple-store gaps from live client review: treat blank `PAYLOAD_SECRET` as unset and write a filled `.env` at init; add `/order/success`; wire cart qty/remove + badge; drive storefront branding from `siteConfig.name`; return JSON checkout/cart errors; enforce stock on add/checkout.

## 1.2.2

### Patch Changes

- ebf83ec: Emit a CJS build and add a `require` export condition so Tailwind (which loads `tailwind.config` via `createRequire`) can resolve `vitrinePreset` from `@vitrine-kit/contracts`. Without this, scaffolded clients fail at `pnpm dev` with `No "exports" main defined`.

## 1.2.1

### Patch Changes

- 394587f: Package hygiene: declare `engines.node >= 20` and `sideEffects: false` on the published
  packages; document the contract-API semantics of `CONTRACTS_VERSION` (stable until a
  breaking contract change — not the npm package version) and enforce the contracts/CLI pair
  with a test.

## 1.2.0

### Minor Changes

- 610d52e: English-only product: all user-facing text is now English. The CLI's output and the
  artifacts it generates into the client repo (`README.md`, `CLAUDE.md`, `.env.example`,
  `.claude/commands/*`, `AGENTS.md`) are in English, as are runtime error messages across
  `@vitrine-kit/core` and `@vitrine-kit/payload-blueprint`, and the demo seed (English
  products/categories). The default `site.config` i18n is now `defaultLocale: 'en'`,
  `locales: ['en']`, `currency: 'USD'` (previously `ru`/`['ru']`/`'RUB'`) — explicit values
  in an existing client's `site.config` are unaffected.

## 1.1.0

### Minor Changes

- 9d4ae82: Move to the `vitrine-kit` organization: packages renamed from the `@maks417/*` scope to
  `@vitrine-kit/*` and published to the **public npm** (npmjs.com, with provenance) instead of private
  GitHub Packages. License — **MIT**. Installation no longer requires a token/PAT: not for client repos,
  not for CI, not for the Docker build. Inside the monorepo packages are still linked via `workspace:*`.

## 1.0.0

### Major Changes

- 65062d9: M1: the first stable version of the contracts (1.0.0). Five contracts — Tokens, Data
  (CatalogSource/CommerceBackend + normalized types), Slots (a closed set of
  32 slots), Config (site.config), Blueprint (additive extend). Zod schemas for the
  manifests (feature.json, vitrine.json, registry \_index.json) and JSON Schema
  generation in schemas/ from a single source (zod). Extend additively only.

### Minor Changes

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
