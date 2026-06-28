// @vitrine-kit/core — Vitrine's framework-agnostic runtime.
// The React <Slot> wrapper is split into the @vitrine-kit/core/react subpath so non-React
// consumers (e.g. the CLI) don't pull in react.

// Keep in sync with the package.json version (bumped by a changeset).
export const CORE_VERSION = '0.2.1' as const;

export * from './slots/registry.js';
export * from './adapter/resolver.js';
export * from './order/pipeline.js';
export * from './order/idempotency.js';
export * from './payment/provider.js';
export * from './payment/registry.js';
export * from './payment/webhook.js';
export * from './commerce/cart.js';
export * from './commerce/order.js';
