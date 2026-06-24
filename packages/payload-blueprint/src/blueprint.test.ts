import { describe, expect, it } from 'vitest';
import { createBlueprint } from './blueprint.js';

const products = (cols: { slug: string; fields: { name: string }[] }[]) =>
  cols.find((c) => c.slug === 'products')!;

describe('blueprint', () => {
  it('build() returns the base collections', () => {
    const slugs = createBlueprint().build().map((c) => c.slug);
    expect(slugs).toEqual(['categories', 'media', 'users', 'products', 'variants', 'orders', 'carts']);
  });

  it('extend() additively adds a field', () => {
    const bp = createBlueprint();
    bp.extend('product', { addFields: [{ name: 'reviewsEnabled', type: 'checkbox' }] });
    const names = products(bp.build()).fields.map((field) => field.name);
    expect(names).toContain('reviewsEnabled');
    // existing fields are still there
    expect(names).toContain('title');
    expect(names).toContain('slug');
  });

  it('does not touch other collections', () => {
    const bp = createBlueprint();
    bp.extend('product', { addFields: [{ name: 'reviewsEnabled', type: 'checkbox' }] });
    const variants = bp.build().find((c) => c.slug === 'variants')!;
    expect(variants.fields.map((f) => f.name)).not.toContain('reviewsEnabled');
  });

  it('throws when overwriting an existing field (not additive)', () => {
    const bp = createBlueprint();
    bp.extend('product', { addFields: [{ name: 'title', type: 'text' }] });
    expect(() => bp.build()).toThrow(/additive only/);
  });
});
