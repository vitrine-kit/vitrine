# @vitrine-kit/core

Vitrine's critical logic: the slot and adapter runtime, the order pipeline, and provider-neutral payment webhook dispatch.

This is where "a bug = an incident for every client at once" (spec §4). That's why it's a **versioned package** rather than copy-in: a critical fix reaches everyone via a version bump.

## Global registries and isolation

`slotRegistry`, `adapters`, and `payments` are **module-level singletons** — state is shared by
everything importing this package in one process. That is the right default for a Vitrine client
(1 client = 1 repository = 1 store; `lib/slots.ts` / `lib/payments.ts` register once at module
load, which is idempotent-safe because generated registration modules only run once per process).

Do NOT reach for the globals when you need isolation:

- **Tests** — create your own: `createSlotRegistry()`, `createAdapterRegistry()`,
  `createPaymentRegistry()`; `<Slot registry={...}>` accepts one. Or `clear()` the global in a
  `finally` block.
- **Multi-tenant / multi-store servers** — one process serving several stores must NOT share the
  globals (registrations from one tenant would leak into another). Keep a registry instance per
  tenant and pass it explicitly.

Registering the same mount twice (e.g. calling a `register<Feature>Slots()` again after HMR)
duplicates it — re-registration should go through `clear()` first.
