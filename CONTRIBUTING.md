# Contributing

## Setup and checks

```bash
pnpm install
pnpm build                # turbo: build all packages (respects the dependency graph)
pnpm typecheck            # tsc across packages
pnpm test                 # vitest across packages/sandbox
pnpm lint                 # biome lint — the FORMATTER IS OFF, match the existing style by hand
pnpm typecheck:registry   # when touching registry/ (copy-in feature files)
pnpm typecheck:templates  # when touching templates/
```

`schemas/` is **generated** from the zod contracts — never edit it by hand; run
`pnpm schemas` and commit the result (CI fails on drift).

## Rules of the road

- The five contracts in `@vitrine-kit/contracts` are extended **additively only** (semver);
  changing the shape of existing fields is a breaking change.
- `registry/<feature>/files/` and `templates/<name>/files/` mirror the root of a client
  repository — keep relative imports valid for both the monorepo and copy-in.
- Code, comments, and docs are in English.

## Versioning and releases

Any `@vitrine-kit/*` package change needs a changeset: `pnpm changeset` (pick the affected
packages and semver level). Do not run `version`/`publish` yourself — the release workflow
does that on push to `main`. Registry/template-only changes reach clients via the published
`@vitrine-kit/vitrine` kit bundle (`vitrine kit update`), so they should ride together with
a CLI changeset.

Source `registry/*/feature.json` keeps `"kitVersion": "0.0.0"` on purpose — `copy-kit.mjs`
stamps the CLI package version into `packages/cli/kit/` at build/publish time. Do not
hand-bump every feature.json; bump `@vitrine-kit/vitrine` via changesets instead.

## Docker smoke (generated client)

With Docker Desktop running:

```bash
pnpm build
node packages/cli/dist/index.js init --yes --tier simple-store --project /tmp/vitrine-docker-smoke
cd /tmp/vitrine-docker-smoke
PAYLOAD_SECRET=smoke-secret-change-me docker compose up --build
```

Compose defaults `SEED_ON_BOOT=1` so the first boot seeds the demo catalog and prints a
bootstrap admin password. Open http://localhost:3000 and `/admin`.


## Reporting security issues

See [SECURITY.md](SECURITY.md) — please do not open public issues for vulnerabilities.
