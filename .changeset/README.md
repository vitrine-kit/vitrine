# Changesets

Vitrine package versions and releases are managed with [Changesets](https://github.com/changesets/changesets).

- `pnpm changeset` — describe a change (which packages, bump type).
- `pnpm version-packages` — apply changesets, bump versions, build the CHANGELOG.
- `pnpm release` — build and publish to npm (npmjs.com; CI on merge to `main`).

**Contracts:** `@vitrine-kit/contracts` is changed additively only (see spec §5). A breaking contract change = a major bump and a deliberate decision.
