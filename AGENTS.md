# AGENTS.md

## Cursor Cloud specific instructions

Vitrine is a **pnpm + Turborepo monorepo** (no long-running server). It ships four
`@vitrine-kit/*` library packages, a copy-in feature `registry/`, client `templates/`, and the
`vitrine` CLI. There is nothing to "serve" — you exercise it by running the packages' checks, the
`sandbox` demo, and the built CLI. Standard commands live in `README.md`, `CONTRIBUTING.md`, root
`package.json` scripts, and `.github/workflows/ci.yml`; prefer those over duplicating here.

Non-obvious caveats:

- **Node version**: `.nvmrc` pins Node 20, but `engines` is `>=20` and the default cloud VM Node
  (v22, from `/exec-daemon`) works for install/build/typecheck/test/lint/schemas. No `nvm use` is
  required. `pnpm` (9.15.0, matching `packageManager`) is already on PATH.
- **`pnpm build` mutates tracked files**: the build regenerates
  `packages/*/src/*version*.generated.ts` from each package's `package.json`. If those committed
  copies are stale, a plain `pnpm build` leaves them dirty in `git status`. This churn is expected —
  do not commit it unless you are intentionally bumping versions (`git checkout --` to discard).
- **Schemas are generated, CI checks drift**: `schemas/` is produced from the zod contracts. Run
  `pnpm schemas` after touching `packages/contracts`; CI runs `pnpm schemas && git diff --exit-code
  schemas` and fails on drift. Never hand-edit `schemas/`.
- **Biome formatter is OFF**: `pnpm lint` only lints; match existing style by hand.
- **Run the CLI without global install**: after `pnpm build`, run `node packages/cli/dist/index.js
  <cmd>`. Use `init --yes` (with `--tier`/`--features`) for non-interactive scaffolding, and pass
  `--project <dir>` to `list`/`doctor`/`add` to target a scaffolded client outside the monorepo.
- **Sandbox demo**: `pnpm --filter sandbox demo` (needs a prior `pnpm build`) is the quickest smoke
  test of the core slot registry + payload blueprint runtime.
