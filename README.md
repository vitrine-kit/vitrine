# Vitrine

An agentic starter kit for quickly assembling client e-commerce stores and catalogs. A feature
registry in the shadcn/ui style (copy-in), but for **whole store features**, behind five stable
contracts. One client = one repository; the unique design is applied by an AI step.

## Monorepo layout

```
packages/
  contracts/         @vitrine-kit/contracts — five contracts (Tokens, Data, Slots, Config, Blueprint)
  core/              @vitrine-kit/core — slot/adapter runtime, order pipeline, Stripe webhook
  payload-blueprint/ @vitrine-kit/payload-blueprint — base collections + extend()
  cli/               @vitrine-kit/vitrine — CLI (install primitive, init, add, update, doctor)
registry/            copy-in feature registry (catalog, product-page, seo, cart, checkout-stripe)
templates/           client repo skeletons: base, backend-payload, backend-vendure
sandbox/             core-development playground (features on contracts only)
schemas/             JSON Schema (generated from zod in contracts)
```

## Fixed parameters

| | |
|---|---|
| Package registry | **npm** (public, npmjs.com), scope `@vitrine-kit` |
| Runtime | **Node 20 LTS + pnpm** |
| Template stack | Next.js + Tailwind + Payload 3 |
| Reference hosting | **VPS + Docker** (app + Postgres) |
| Versioning | Changesets · Turborepo |
| License | **MIT** ([LICENSE](LICENSE)) |

## Development

```bash
pnpm install
pnpm build       # turbo: build all packages
pnpm typecheck
pnpm test
pnpm changeset   # describe a version change
```

> The `@vitrine-kit/*` packages are public on npm — no token is needed to install them. Inside the
> monorepo, packages are linked via `workspace:*`.

## Release / publishing

Versions are managed with [Changesets](.changeset). Flow on push to `main`
([.github/workflows/release.yml](.github/workflows/release.yml)):

1. Pending changesets → the bot opens a **"Version Packages"** PR (version bumps + CHANGELOG).
2. PR merged → CI publishes the changed `@vitrine-kit/*` to npm (npmjs.com, with provenance), pushes
   git tags, and creates GitHub Releases. The release source archive is what `vitrine kit update` pulls.

```bash
pnpm changeset          # describe a change (locally)
# the rest is automated by CI; manually: pnpm version-packages && pnpm release
```

## Status

The kit is complete and published: the `@vitrine-kit/*` packages are on npm, the copy-in feature
registry and the `base` / `backend-payload` / `backend-vendure` templates are in place, and the
build/typecheck/tests/schemas gate is green.
