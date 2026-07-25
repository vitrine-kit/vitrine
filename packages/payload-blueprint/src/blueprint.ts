// Implementation of contract 5 (Blueprint): features additively extend collections via
// extend('product', { addFields }); build() assembles the final collections,
// checking that no added field overwrites an existing one. Features may also
// addCollection() for auth/ops collections that are not in the base set.
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
  /** Add a collection that is not in the base set (e.g. storefront customers). */
  addCollection(config: BlueprintCollectionConfig): void;
  /** Assembles the base collections + additive extensions + extras. */
  build(): BlueprintCollectionConfig[];
}

export function createBlueprint(): Blueprint {
  const additions = new Map<string, BlueprintFieldDef[]>();
  const extras: BlueprintCollectionConfig[] = [];

  const extend: Extend = (collection, patch) => {
    const slug = SLUG_BY_COLLECTION[collection];
    const list = additions.get(slug) ?? [];
    list.push(...patch.addFields);
    additions.set(slug, list);
  };

  function addCollection(config: BlueprintCollectionConfig): void {
    const taken = new Set([
      ...baseCollections.map((c) => c.slug),
      ...extras.map((c) => c.slug),
    ]);
    if (taken.has(config.slug)) {
      throw new Error(
        `[vitrine] blueprint: collection "${config.slug}" already exists — addCollection() is additive only`,
      );
    }
    extras.push(config);
  }

  function build(): BlueprintCollectionConfig[] {
    const extended = baseCollections.map((base) => {
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
    return [...extended, ...extras];
  }

  return { extend, addCollection, build };
}
