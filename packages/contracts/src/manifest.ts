// Manifests: feature.json (§8), the vitrine.json lock (§6), the registry _index.json.
// Source of truth for the JSON Schemas that validate output (incl. the AI's, §13).
import { z } from 'zod';
import { backendSchema, tierSchema } from './common.js';
import { slotRegistrationSchema } from './slots.js';
import { blueprintManifestSchema } from './blueprint.js';

export const featureFileMapSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

export const featureEnvSchema = z.object({
  key: z.string().min(1),
  required: z.boolean().default(false),
});

/** registry/<feature>/feature.json — the declarative feature manifest (§8). */
export const featureManifestSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  kitVersion: z.string().min(1),
  /** semver range of required contracts, e.g. ">=1.0.0 <2.0.0". */
  requiresContracts: z.string().min(1),
  tier: z.array(tierSchema).nonempty(),
  registryDependencies: z.array(z.string()).default([]),
  /** Versioned packages: { "@vitrine-kit/core": ">=1.0.0" }. */
  corePackages: z.record(z.string(), z.string()).default({}),
  npm: z.array(z.string()).default([]),
  files: z.array(featureFileMapSchema).default([]),
  config: z.object({ set: z.record(z.string(), z.boolean()) }).optional(),
  /**
   * The payment provider of a checkout-<provider> feature. From it the CLI: (1) generates
   * the provider registration in lib/payments.ts, (2) sets integrations.payments
   * in site.config. register<Pascal>Provider() is exported from lib/<name>/register.ts.
   */
  payment: z.object({ provider: z.enum(['stripe', 'paddle', 'yookassa']) }).optional(),
  slots: z.array(slotRegistrationSchema).default([]),
  blueprint: blueprintManifestSchema.optional(),
  env: z.array(featureEnvSchema).default([]),
  /** Doc appended to the client's CLAUDE.md. */
  claudeDoc: z.string().optional(),
  conflicts: z.array(z.string()).default([]),
  removable: z.boolean().default(true),
});
export type FeatureManifest = z.infer<typeof featureManifestSchema>;

/** vitrine.json — the client repo's lock file (§6). */
export const vitrineLockSchema = z.object({
  kitVersion: z.string().min(1),
  contracts: z.string().min(1),
  backend: backendSchema,
  tier: tierSchema,
  features: z
    .record(z.string(), z.object({ version: z.string().min(1) }))
    .default({}),
});
export type VitrineLock = z.infer<typeof vitrineLockSchema>;

/** registry/_index.json — the registry manifest: all features + the kit version. */
export const registryIndexSchema = z.object({
  kitVersion: z.string().min(1),
  contracts: z.string().min(1),
  features: z
    .record(
      z.string(),
      z.object({
        title: z.string(),
        kitVersion: z.string(),
        tier: z.array(tierSchema),
      }),
    )
    .default({}),
});
export type RegistryIndex = z.infer<typeof registryIndexSchema>;
