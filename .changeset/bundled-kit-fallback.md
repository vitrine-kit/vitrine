---
"@vitrine-kit/vitrine": minor
---

`vitrine init` / `add` now work immediately after a global install — the CLI ships the
registry and templates bundled in the package (`kit/`), so `npm i -g @vitrine-kit/vitrine`
followed by `vitrine init` scaffolds a project **without** needing `vitrine kit update` first.
`resolveRegistryRoot` falls back to the bundled kit when neither the `~/.vitrine` cache nor a
monorepo dev registry is found. `kit update` / `add` / `update` still use the `~/.vitrine`
cache; only the bundled fallback is new.

Generated `lib/slots.ts` and `lib/payments.ts` now reset their registry before re-registering
(`slotRegistry.clear()` / `payments.clear()`), so repeated invocation (e.g. dev-server HMR)
no longer duplicates slot mounts or payment providers.

Internal: the kit version constants written into the client scaffold are now generated from the
`@vitrine-kit/*` package versions at build time instead of being hand-maintained, removing the
drift between the constants and the published versions.
