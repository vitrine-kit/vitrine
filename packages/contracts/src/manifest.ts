// Манифесты: feature.json (§8), vitrine.json lock (§6), registry _index.json.
// Источник истины для JSON Schema, которыми валидируется вывод (в т.ч. ИИ, §13).
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

/** registry/<feature>/feature.json — декларативный манифест фичи (§8). */
export const featureManifestSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  kitVersion: z.string().min(1),
  /** semver-диапазон требуемых контрактов, напр. ">=1.0.0 <2.0.0". */
  requiresContracts: z.string().min(1),
  tier: z.array(tierSchema).nonempty(),
  registryDependencies: z.array(z.string()).default([]),
  /** Версионируемые пакеты: { "@maks417/core": ">=1.0.0" }. */
  corePackages: z.record(z.string(), z.string()).default({}),
  npm: z.array(z.string()).default([]),
  files: z.array(featureFileMapSchema).default([]),
  config: z.object({ set: z.record(z.string(), z.boolean()) }).optional(),
  slots: z.array(slotRegistrationSchema).default([]),
  blueprint: blueprintManifestSchema.optional(),
  env: z.array(featureEnvSchema).default([]),
  /** Док, дописываемый в CLAUDE.md клиента. */
  claudeDoc: z.string().optional(),
  conflicts: z.array(z.string()).default([]),
  removable: z.boolean().default(true),
});
export type FeatureManifest = z.infer<typeof featureManifestSchema>;

/** vitrine.json — лок-файл клиентского репо (§6). */
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

/** registry/_index.json — манифест реестра: все фичи + версия kit. */
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
