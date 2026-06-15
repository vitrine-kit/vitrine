// @maks417/core — фреймворк-агностичный runtime Vitrine.
// React-обёртка <Slot> вынесена в подпуть @maks417/core/react, чтобы не-React
// потребители (например CLI) не тянули react.

export const CORE_VERSION = '0.0.0' as const;

export * from './slots/registry.js';
export * from './adapter/resolver.js';
export * from './order/pipeline.js';
export * from './stripe/webhook.js';
export * from './commerce/cart.js';
export * from './commerce/order.js';
