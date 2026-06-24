// Contract 5 · Blueprint
// The API for additively extending Payload collections from features (spec §5).
// Hard rule: extend() ONLY adds fields, never changes/removes them.
import { z } from 'zod';

/** Base blueprint collections a feature can extend. */
export const BLUEPRINT_COLLECTIONS = [
  'product', 'variant', 'category', 'media', 'order', 'user',
] as const;
export type BlueprintCollection = (typeof BLUEPRINT_COLLECTIONS)[number];

export const blueprintCollectionSchema = z.enum(BLUEPRINT_COLLECTIONS);

/** Supported types for added fields (minimal v1 set). */
export const BLUEPRINT_FIELD_TYPES = [
  'text', 'textarea', 'richText', 'number', 'checkbox', 'select',
  'relationship', 'date', 'json', 'array', 'group',
] as const;
export type BlueprintFieldType = (typeof BLUEPRINT_FIELD_TYPES)[number];

/**
 * Definition of an added field (runtime form for @vitrine-kit/payload-blueprint).
 * Allows extra Payload field keys (options, relationTo, …) via passthrough.
 */
export const blueprintFieldDefSchema = z
  .object({
    name: z.string().min(1),
    type: z.enum(BLUEPRINT_FIELD_TYPES),
    required: z.boolean().optional(),
    label: z.string().optional(),
  })
  .passthrough();
export type BlueprintFieldDef = z.infer<typeof blueprintFieldDefSchema>;

/** Runtime extension applied by extend(). */
export interface BlueprintExtension {
  extend: BlueprintCollection;
  addFields: BlueprintFieldDef[];
}

/**
 * The extend() signature, implemented in @vitrine-kit/payload-blueprint.
 * Additive by contract: it adds fields to a collection.
 */
export type Extend = (
  collection: BlueprintCollection,
  patch: { addFields: BlueprintFieldDef[] },
) => void;

/**
 * The blueprint shape in the feature manifest (feature.json, §8): addFields are field NAMES
 * (strings); the actual definitions live in the feature code / payload-blueprint.
 */
export const blueprintManifestSchema = z.object({
  extend: blueprintCollectionSchema,
  addFields: z.array(z.string().min(1)),
});
export type BlueprintManifest = z.infer<typeof blueprintManifestSchema>;
