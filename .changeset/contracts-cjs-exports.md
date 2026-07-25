---
"@vitrine-kit/contracts": patch
---

Emit a CJS build and add a `require` export condition so Tailwind (which loads `tailwind.config` via `createRequire`) can resolve `vitrinePreset` from `@vitrine-kit/contracts`. Without this, scaffolded clients fail at `pnpm dev` with `No "exports" main defined`.
