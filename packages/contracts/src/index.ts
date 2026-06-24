// @vitrine-kit/contracts
// The five stable Vitrine contracts under semver. Extend ADDITIVELY only.
//
// 1 · Tokens     → ./tokens
// 2 · Data       → ./data
// 3 · Slots      → ./slots
// 4 · Config     → ./config
// 5 · Blueprint  → ./blueprint
// Manifests (feature.json / vitrine.json / registry) → ./manifest

export const CONTRACTS_VERSION = '1.0.0' as const;

export * from './common.js';
export * from './tokens.js';
export * from './data.js';
export * from './slots.js';
export * from './config.js';
export * from './blueprint.js';
export * from './manifest.js';
