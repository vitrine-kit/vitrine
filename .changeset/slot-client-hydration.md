---
'@vitrine-kit/core': patch
'@vitrine-kit/vitrine': patch
---

Make `@vitrine-kit/core/react` `<Slot>` a Client Component and wrap the storefront layout with `SlotsProvider` so registry-mounted client UI hydrates. Allow `'unsafe-eval'` in the template CSP during `next dev` (webpack/Fast Refresh); without it Add to cart and other client handlers never attach.
