# Vitrine

An agentic starter kit for quickly assembling client e-commerce stores and catalogs. A feature
registry in the shadcn/ui style (copy-in), but for **whole store features**, behind five stable
contracts. One client = one repository; the unique design is applied by an AI step.

## Monorepo layout

```
packages/
  contracts/         @vitrine-kit/contracts — five contracts (Tokens, Data, Slots, Config, Blueprint)
  core/              @vitrine-kit/core — slot/adapter runtime, order pipeline, payment webhook dispatch
  payload-blueprint/ @vitrine-kit/payload-blueprint — base collections + extend()
  cli/               @vitrine-kit/vitrine — CLI (install primitive, init, add, update, doctor)
registry/            copy-in feature registry (catalog, product-page, seo, cart, checkout + stripe/paddle/yookassa)
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

## Quickstart (generate a client store)

```bash
npm i -g @vitrine-kit/vitrine
vitrine init my-shop     # wizard: tier (catalog | simple-store | full-store), backend, features
cd my-shop
pnpm install
pnpm dev                 # Next.js storefront + zero-config dev backend
```

The CLI works offline out of the box (a kit snapshot ships with the package);
`vitrine kit update` refreshes the local registry (`~/.vitrine`) from the latest GitHub
release (needs the [gh CLI](https://cli.github.com)).

## Features (copy-in registry)

| Feature | Tiers | What you get |
|---|---|---|
| `catalog` | catalog, simple-store, full-store | product grid, category navigation |
| `product-page` | catalog, simple-store, full-store | product view with gallery |
| `seo` | catalog, simple-store, full-store | metadata + JSON-LD |
| `cart` | simple-store, full-store | cart page, cart API |
| `checkout` | simple-store, full-store | provider-neutral checkout orchestration |
| `checkout-stripe` / `checkout-paddle` / `checkout-yookassa` | simple-store, full-store | payment provider implementations (mutually exclusive; pull in `checkout`) |

## CLI

| Command | Purpose |
|---|---|
| `vitrine init [name]` | scaffold a client repo (templates + chosen features) |
| `vitrine add <features…>` | install features into an existing client |
| `vitrine remove <feature>` | remove a feature (exact-file deletion, transactional) |
| `vitrine list` | features in the registry vs installed |
| `vitrine update [features…]` | 3-way merge new feature versions into the client (`--dry-run` to preview) |
| `vitrine diff <feature>` | show the update plan without writing |
| `vitrine doctor` | consistency check: lock ↔ files ↔ env ↔ generated code |
| `vitrine design apply` | apply the design instruction from CLAUDE.md via Claude Code |
| `vitrine kit update / status` | manage the local kit cache (`~/.vitrine`) |
| `vitrine self-update` | update the global CLI |

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

## Contributing & security

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and the rules of the road. Report
vulnerabilities privately per [SECURITY.md](SECURITY.md) — not via public issues.
