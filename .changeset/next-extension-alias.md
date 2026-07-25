---
"@vitrine-kit/vitrine": patch
---

Scaffolded Next configs now set webpack `resolve.extensionAlias` so TypeScript ESM-style relative imports (`.js` → `.ts`/`.tsx`) resolve under `next dev`. Without this, client projects fail to compile feature components like `ProductCard.js`.

Treat empty `DEV_ADMIN_EMAIL` / `DEV_ADMIN_PASSWORD` from `.env.example` as unset (use `||` defaults, not `??`) and pass `overrideAccess: true` when creating the zero-config admin. Empty env values previously made `ensureDevAdmin` fail validation and aborted the first storefront request.
