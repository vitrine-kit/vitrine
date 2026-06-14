import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initProject } from './init.js';
import { installFeatures, removeFeature } from './install.js';
import { loadProject } from './project.js';
import { createRegistrySource } from './registry.js';
import {
  mergePackageDeps,
  renderBlueprintFile,
  renderFeaturesRegion,
  renderSlotsFile,
  type FeatureState,
} from './generate.js';
import { replaceBetween } from './util.js';

const here = dirname(fileURLToPath(import.meta.url));
const monorepoRegistry = join(here, '..', '..', '..', 'registry');
const registry = createRegistrySource(monorepoRegistry);

const tmps: string[] = [];
function tmp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'vitrine-'));
  tmps.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of tmps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const read = (root: string, rel: string) => readFileSync(join(root, rel), 'utf8');

describe('init + примитив установки (DoD)', () => {
  it('init каталога ставит catalog/product-page/seo и пишет всё консистентно', () => {
    const root = join(tmp(), 'shop');
    const res = initProject({
      root,
      name: 'shop',
      backend: 'payload',
      tier: 'catalog',
      features: ['catalog', 'product-page', 'seo'],
      registry,
    });
    expect(res.installed.sort()).toEqual(['catalog', 'product-page', 'seo']);

    // файлы скопированы
    expect(existsSync(join(root, 'components/catalog/ProductCard.tsx'))).toBe(true);
    expect(existsSync(join(root, 'components/product/ProductView.tsx'))).toBe(true);
    expect(existsSync(join(root, 'lib/seo/metadata.ts'))).toBe(true);

    // vitrine.json
    const lock = JSON.parse(read(root, 'vitrine.json'));
    expect(Object.keys(lock.features).sort()).toEqual(['catalog', 'product-page', 'seo']);

    // флаги в site.config
    const config = read(root, 'site.config.ts');
    expect(config).toContain('"catalog": true');
    expect(config).toContain('"seo": true');

    // слоты: catalog регистрирует свой register
    const slots = read(root, 'lib/slots.ts');
    expect(slots).toContain('registerCatalogSlots');

    // CLAUDE.md таблица
    expect(read(root, 'CLAUDE.md')).toContain('| `catalog` |');

    // pristine-снапшоты для M9
    expect(existsSync(join(root, '.vitrine/originals/catalog@0.0.0/components/catalog/ProductCard.tsx'))).toBe(true);
  });

  it('повторный add той же версии — no-op', () => {
    const root = join(tmp(), 'shop');
    initProject({ root, name: 'shop', backend: 'payload', tier: 'catalog', features: ['catalog'], registry });
    const before = read(root, 'site.config.ts');
    const project = loadProject(root);
    const res = installFeatures(project, ['catalog'], registry);
    expect(res.installed).toEqual([]);
    expect(read(root, 'site.config.ts')).toBe(before);
  });

  it('add тянет registryDependencies (product-page → catalog)', () => {
    const root = join(tmp(), 'shop');
    initProject({ root, name: 'shop', backend: 'payload', tier: 'catalog', features: [], registry });
    const project = loadProject(root);
    const res = installFeatures(project, ['product-page'], registry);
    expect(res.installed).toEqual(['catalog', 'product-page']); // зависимость раньше
    expect(existsSync(join(root, 'components/catalog/ProductCard.tsx'))).toBe(true);
  });

  it('removable: false нельзя удалить', () => {
    const root = join(tmp(), 'shop');
    initProject({ root, name: 'shop', backend: 'payload', tier: 'catalog', features: ['catalog'], registry });
    const project = loadProject(root);
    expect(() => removeFeature(project, 'catalog', registry)).toThrow(/не удаляема/);
  });
});

describe('откат при ошибке', () => {
  function brokenRegistry(): string {
    const dir = mkdtempSync(join(tmpdir(), 'vitrine-reg-'));
    tmps.push(dir);
    writeFileSync(
      join(dir, '_index.json'),
      JSON.stringify({
        kitVersion: '0.0.0',
        contracts: '1.0.0',
        features: {
          good: { title: 'Good', kitVersion: '0.0.0', tier: ['catalog'] },
          bad: { title: 'Bad', kitVersion: '0.0.0', tier: ['catalog'] },
        },
      }),
    );
    mkdirSync(join(dir, 'good', 'files', 'lib', 'good'), { recursive: true });
    writeFileSync(join(dir, 'good', 'files', 'lib', 'good', 'x.ts'), 'export const x = 1;\n');
    writeFileSync(
      join(dir, 'good', 'feature.json'),
      JSON.stringify({
        name: 'good', title: 'Good', kitVersion: '0.0.0', requiresContracts: '>=1.0.0',
        tier: ['catalog'], files: [{ from: 'files/lib/good/', to: 'lib/good/' }],
        config: { set: { 'features.good': true } },
      }),
    );
    mkdirSync(join(dir, 'bad'), { recursive: true });
    writeFileSync(
      join(dir, 'bad', 'feature.json'),
      JSON.stringify({
        name: 'bad', title: 'Bad', kitVersion: '0.0.0', requiresContracts: '>=1.0.0',
        tier: ['catalog'], files: [{ from: 'files/missing/', to: 'lib/bad/' }],
        config: { set: { 'features.bad': true } },
      }),
    );
    return dir;
  }

  it('падение на фиче N откатывает уже скопированное', () => {
    const reg = createRegistrySource(brokenRegistry());
    const root = join(tmp(), 'shop');
    initProject({ root, name: 'shop', backend: 'payload', tier: 'catalog', features: [], registry: reg });
    const project = loadProject(root);

    expect(() => installFeatures(project, ['good', 'bad'], reg)).toThrow(/нет источника/);
    // good скопирован первым, но bad упал → всё откатилось
    expect(existsSync(join(root, 'lib/good/x.ts'))).toBe(false);
    expect(project.lock.features.good).toBeUndefined();
    expect(JSON.parse(read(root, 'vitrine.json')).features).toEqual({});
  });
});

describe('генераторы (чистые)', () => {
  const fakeManifest = (over: Record<string, unknown> = {}) =>
    ({
      name: 'x', title: 'X', kitVersion: '0.0.0', requiresContracts: '>=1.0.0',
      tier: ['catalog'], registryDependencies: [], corePackages: {}, npm: [],
      files: [], slots: [], env: [], conflicts: [], removable: true, ...over,
    }) as unknown as FeatureState['manifest'];

  it('renderFeaturesRegion собирает флаги из config.set', () => {
    const states: FeatureState[] = [
      { name: 'catalog', version: '0.0.0', manifest: fakeManifest({ config: { set: { 'features.catalog': true } } }) },
    ];
    expect(renderFeaturesRegion(states)).toContain('"catalog": true');
  });

  it('renderSlotsFile зовёт register<Name>Slots только для фич со слотами', () => {
    const withSlots: FeatureState = {
      name: 'catalog', version: '0.0.0',
      manifest: fakeManifest({ slots: [{ slot: 'global.header-nav', component: 'CategoryNav' }] }),
    };
    const noSlots: FeatureState = { name: 'seo', version: '0.0.0', manifest: fakeManifest() };
    const out = renderSlotsFile([withSlots, noSlots]);
    expect(out).toContain('registerCatalogSlots');
    expect(out).not.toContain('registerSeoSlots');
  });

  it('renderBlueprintFile подключает extend<Name>Blueprint для фич с blueprint', () => {
    const f: FeatureState = {
      name: 'reviews', version: '0.0.0',
      manifest: fakeManifest({ blueprint: { extend: 'product', addFields: ['reviewsEnabled'] } }),
    };
    expect(renderBlueprintFile([f])).toContain('extendReviewsBlueprint');
  });

  it('mergePackageDeps добавляет corePackages и npm', () => {
    const f: FeatureState = {
      name: 'reviews', version: '0.0.0',
      manifest: fakeManifest({ corePackages: { '@maks417/core': '>=0.1.0' }, npm: ['zod@^3'] }),
    };
    const pkg = mergePackageDeps({ dependencies: {} }, [f]);
    expect((pkg.dependencies as Record<string, string>)['@maks417/core']).toBe('>=0.1.0');
    expect((pkg.dependencies as Record<string, string>).zod).toBe('^3');
  });

  it('replaceBetween заменяет только содержимое между маркерами', () => {
    const src = 'a\n// s\nOLD\n// e\nb';
    expect(replaceBetween(src, '// s', '// e', 'NEW')).toBe('a\n// s\nNEW\n// e\nb');
  });
});
