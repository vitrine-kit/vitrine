---
"@vitrine-kit/core": patch
"@vitrine-kit/payload-blueprint": patch
---

`CORE_VERSION` / `PAYLOAD_BLUEPRINT_VERSION` are now generated from package.json at
build/typecheck time (the same pattern as the CLI's kit constants) instead of being
hand-maintained — the "Version Packages" PR no longer fails the version-pin tests when
the changesets bot bumps versions.
