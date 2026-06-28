import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBlueprint } from './blueprint.js';
import { PAYLOAD_BLUEPRINT_VERSION } from './index.js';

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

describe('package version', () => {
  it('PAYLOAD_BLUEPRINT_VERSION matches package.json', () => {
    const pkg = JSON.parse(
      readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8'),
    ) as { version: string };
    expect(PAYLOAD_BLUEPRINT_VERSION).toBe(pkg.version);
  });
});
