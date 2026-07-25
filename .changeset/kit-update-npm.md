---
'@vitrine-kit/vitrine': patch
---

Switch `vitrine kit update` from GitHub `gh release` downloads to public npm (`npm install @vitrine-kit/vitrine` into a temp prefix), using the package's bundled `kit/` registry + templates. Version is an optional positional arg (`vitrine kit update [version]`).
