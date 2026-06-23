// Реализация контракта 5 (Blueprint): фичи аддитивно расширяют коллекции через
// extend('product', { addFields }); build() собирает финальные коллекции,
// проверяя, что ни одно добавленное поле не перетирает существующее.
import type { BlueprintCollection, BlueprintFieldDef, Extend } from '@vitrine-kit/contracts';
import { baseCollections, type BlueprintCollectionConfig } from './collections.js';

/** Имя контракта-коллекции → slug базовой коллекции. */
const SLUG_BY_COLLECTION: Record<BlueprintCollection, string> = {
  product: 'products',
  variant: 'variants',
  category: 'categories',
  media: 'media',
  order: 'orders',
  user: 'users',
};

export interface Blueprint {
  extend: Extend;
  /** Собирает базовые коллекции + аддитивные расширения. */
  build(): BlueprintCollectionConfig[];
}

export function createBlueprint(): Blueprint {
  const additions = new Map<string, BlueprintFieldDef[]>();

  const extend: Extend = (collection, patch) => {
    const slug = SLUG_BY_COLLECTION[collection];
    const list = additions.get(slug) ?? [];
    list.push(...patch.addFields);
    additions.set(slug, list);
  };

  function build(): BlueprintCollectionConfig[] {
    return baseCollections.map((base) => {
      const adds = additions.get(base.slug) ?? [];
      if (adds.length === 0) return base;

      const existing = new Set(base.fields.map((field) => field.name));
      for (const field of adds) {
        if (existing.has(field.name)) {
          throw new Error(
            `[vitrine] blueprint: поле "${field.name}" уже есть в "${base.slug}" — extend() только аддитивен`,
          );
        }
        existing.add(field.name);
      }
      return { ...base, fields: [...base.fields, ...adds] };
    });
  }

  return { extend, build };
}
