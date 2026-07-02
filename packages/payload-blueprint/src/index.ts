// @vitrine-kit/payload-blueprint
// Base Payload collections + additive extend() (contract 5).
// The final binding to Payload buildConfig lives in the backend-payload template.

// Derived from package.json at build/typecheck time (scripts/generate-version.mjs) —
// cannot drift when a changeset bumps the version.
export { PAYLOAD_BLUEPRINT_VERSION } from './version.generated.js';

export * from './collections.js';
export * from './blueprint.js';
