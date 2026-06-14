// Контракт 5 · Blueprint
// API аддитивного расширения Payload-коллекций фичами (§5 спеки).
// Жёсткое правило: extend() ТОЛЬКО добавляет поля, не меняет/не удаляет.
import { z } from 'zod';

/** Базовые коллекции blueprint, которые фича может расширять. */
export const BLUEPRINT_COLLECTIONS = [
  'product', 'variant', 'category', 'media', 'order', 'user',
] as const;
export type BlueprintCollection = (typeof BLUEPRINT_COLLECTIONS)[number];

export const blueprintCollectionSchema = z.enum(BLUEPRINT_COLLECTIONS);

/** Поддерживаемые типы добавляемых полей (минимальный набор v1). */
export const BLUEPRINT_FIELD_TYPES = [
  'text', 'textarea', 'richText', 'number', 'checkbox', 'select',
  'relationship', 'date', 'json', 'array', 'group',
] as const;
export type BlueprintFieldType = (typeof BLUEPRINT_FIELD_TYPES)[number];

/**
 * Определение добавляемого поля (рантайм-форма для @maks417/payload-blueprint).
 * Допускает доп. ключи Payload-поля (options, relationTo, …) через passthrough.
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

/** Рантайм-расширение, применяемое extend(). */
export interface BlueprintExtension {
  extend: BlueprintCollection;
  addFields: BlueprintFieldDef[];
}

/**
 * Сигнатура extend(), реализуемая в @maks417/payload-blueprint.
 * Аддитивна по контракту: добавляет поля в коллекцию.
 */
export type Extend = (
  collection: BlueprintCollection,
  patch: { addFields: BlueprintFieldDef[] },
) => void;

/**
 * Форма blueprint в манифесте фичи (feature.json, §8): addFields — ИМЕНА полей
 * (строки); фактические определения живут в коде фичи / payload-blueprint.
 */
export const blueprintManifestSchema = z.object({
  extend: blueprintCollectionSchema,
  addFields: z.array(z.string().min(1)),
});
export type BlueprintManifest = z.infer<typeof blueprintManifestSchema>;
