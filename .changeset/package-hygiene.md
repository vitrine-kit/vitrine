---
"@vitrine-kit/contracts": patch
"@vitrine-kit/core": patch
"@vitrine-kit/payload-blueprint": patch
---

Package hygiene: declare `engines.node >= 20` and `sideEffects: false` on the published
packages; document the contract-API semantics of `CONTRACTS_VERSION` (stable until a
breaking contract change — not the npm package version) and enforce the contracts/CLI pair
with a test.
