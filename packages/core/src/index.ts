// @maks417/core — фреймворк-агностичный runtime Vitrine.
// React-обёртка <Slot> вынесена в подпуть @maks417/core/react, чтобы не-React
// потребители (например CLI) не тянули react.

// Держать в синхроне с package.json version (бампится changeset'ом).
export const CORE_VERSION = '0.1.0' as const;

export * from './slots/registry.js';
export * from './adapter/resolver.js';
export * from './order/pipeline.js';
export * from './order/idempotency.js';
export * from './payment/provider.js';
export * from './payment/registry.js';
export * from './payment/webhook.js';
export * from './commerce/cart.js';
export * from './commerce/order.js';
