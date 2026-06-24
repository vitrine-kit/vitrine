// Implementation of contract 5 (Blueprint): features additively extend collections via
// extend('product', { addFields }); build() assembles the final collections,
// checking that no added field overwrites an existing one.
import type { BlueprintCollection, BlueprintFieldDef, Extend } from '@vitrine-kit/contracts';
import { baseCollections, type BlueprintCollectionConfig } from './collections.js';

/** Contract collection name → base collection slug. */
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
  /** Assembles the base collections + additive extensions. */
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
            `[vitrine] blueprint: field "${field.name}" already exists in "${base.slug}" — extend() is additive only`,
          );
        }
        existing.add(field.name);
      }
      return { ...base, fields: [...base.fields, ...adds] };
    });
  }

  return { extend, build };
}
