import { describe, expect, it } from 'vitest';
import { createBlueprint } from './blueprint.js';

const products = (cols: { slug: string; fields: { name: string }[] }[]) =>
  cols.find((c) => c.slug === 'products')!;

describe('blueprint', () => {
  it('build() возвращает базовые коллекции', () => {
    const slugs = createBlueprint().build().map((c) => c.slug);
    expect(slugs).toEqual(['categories', 'media', 'users', 'products', 'variants', 'orders']);
  });

  it('extend() аддитивно добавляет поле', () => {
    const bp = createBlueprint();
    bp.extend('product', { addFields: [{ name: 'reviewsEnabled', type: 'checkbox' }] });
    const names = products(bp.build()).fields.map((field) => field.name);
    expect(names).toContain('reviewsEnabled');
    // существующие поля на месте
    expect(names).toContain('title');
    expect(names).toContain('slug');
  });

  it('не трогает другие коллекции', () => {
    const bp = createBlueprint();
    bp.extend('product', { addFields: [{ name: 'reviewsEnabled', type: 'checkbox' }] });
    const variants = bp.build().find((c) => c.slug === 'variants')!;
    expect(variants.fields.map((f) => f.name)).not.toContain('reviewsEnabled');
  });

  it('бросает при перетирании существующего поля (не аддитивно)', () => {
    const bp = createBlueprint();
    bp.extend('product', { addFields: [{ name: 'title', type: 'text' }] });
    expect(() => bp.build()).toThrow(/только аддитивен/);
  });
});
