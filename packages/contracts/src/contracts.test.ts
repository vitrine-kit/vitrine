import { describe, expect, it } from 'vitest';
import { SLOT_IDS } from './slots.js';
import { TOKEN_CSS_VARS } from './tokens.js';
import { siteConfigSchema } from './config.js';
import { featureManifestSchema, vitrineLockSchema } from './manifest.js';

describe('slots', () => {
  it('замкнутый набор v1 без дублей', () => {
    expect(SLOT_IDS.length).toBe(32);
    expect(new Set(SLOT_IDS).size).toBe(SLOT_IDS.length);
  });
});

describe('tokens', () => {
  it('все имена — валидные CSS-переменные --vt-*', () => {
    expect(TOKEN_CSS_VARS.length).toBeGreaterThan(0);
    expect(TOKEN_CSS_VARS.every((v) => v.startsWith('--vt-'))).toBe(true);
    expect(new Set(TOKEN_CSS_VARS).size).toBe(TOKEN_CSS_VARS.length);
  });
});

describe('site.config', () => {
  it('минимальный конфиг проходит с дефолтами', () => {
    const cfg = siteConfigSchema.parse({ backend: 'payload', tier: 'catalog' });
    expect(cfg.features).toEqual({});
    expect(cfg.i18n.defaultLocale).toBe('ru');
    expect(cfg.theme.cssFile).toBe('theme/client.css');
  });
});

describe('feature.json (пример reviews из §8 спеки)', () => {
  it('валиден против схемы', () => {
    const reviews = {
      name: 'reviews',
      title: 'Product reviews',
      kitVersion: '1.6.0',
      requiresContracts: '>=1.0.0 <2.0.0',
      tier: ['simple-store', 'full-store'],
      registryDependencies: ['rating-stars'],
      corePackages: { '@vitrine-kit/core': '>=1.0.0' },
      npm: ['zod@^3'],
      files: [
        { from: 'files/components/reviews/', to: 'components/reviews/' },
        { from: 'files/lib/reviews/binding.ts', to: 'lib/reviews/binding.ts' },
      ],
      config: { set: { 'features.reviews': true } },
      slots: [{ slot: 'product.below-description', component: 'ReviewList', order: 20 }],
      blueprint: { extend: 'product', addFields: ['reviewsEnabled'] },
      env: [{ key: 'REVIEWS_MODERATION', required: false }],
      claudeDoc: 'docs/reviews.md',
      conflicts: [],
      removable: true,
    };
    expect(() => featureManifestSchema.parse(reviews)).not.toThrow();
  });

  it('отклоняет несуществующий слот', () => {
    const bad = {
      name: 'x', title: 'x', kitVersion: '1.0.0', requiresContracts: '>=1.0.0',
      tier: ['catalog'],
      slots: [{ slot: 'product.nope', component: 'X' }],
    };
    expect(() => featureManifestSchema.parse(bad)).toThrow();
  });
});

describe('vitrine.json (пример из §6 спеки)', () => {
  it('лок-файл валиден', () => {
    const lock = {
      kitVersion: '1.6.0',
      contracts: '1.0.0',
      backend: 'payload',
      tier: 'simple-store',
      features: {
        catalog: { version: '1.6.0' },
        cart: { version: '1.5.0' },
      },
    };
    expect(() => vitrineLockSchema.parse(lock)).not.toThrow();
  });
});
