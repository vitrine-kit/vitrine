---
"@vitrine-kit/core": patch
---

`<Slot>` uses stable React keys (component name + occurrence) instead of the array index —
re-registering mounts in a different order no longer hands one component's state to another.
Also: documented isolation guidance for the global registries (tests / multi-tenant must use
the `create*Registry()` factories) and extended unit coverage (`registerMany`, global
accessors, `clear()`, `computeLineTotal`, `buildOrderFromCart`, unhandled webhook kinds).
