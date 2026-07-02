// @vitrine-kit/core — Vitrine's framework-agnostic runtime.
// The React <Slot> wrapper is split into the @vitrine-kit/core/react subpath so non-React
// consumers (e.g. the CLI) don't pull in react.

// Derived from package.json at build/typecheck time (scripts/generate-version.mjs) —
// cannot drift when a changeset bumps the version.
export { CORE_VERSION } from './version.generated.js';

export * from './slots/registry.js';
export * from './adapter/resolver.js';
export * from './order/pipeline.js';
export * from './order/idempotency.js';
export * from './payment/provider.js';
export * from './payment/registry.js';
export * from './payment/webhook.js';
export * from './commerce/cart.js';
export * from './commerce/order.js';
