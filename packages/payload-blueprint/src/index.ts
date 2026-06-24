// @vitrine-kit/payload-blueprint
// Base Payload collections + additive extend() (contract 5).
// The final binding to Payload buildConfig lives in the backend-payload template.

// Keep in sync with the package.json version (bumped by a changeset).
export const PAYLOAD_BLUEPRINT_VERSION = '0.1.0' as const;

export * from './collections.js';
export * from './blueprint.js';
