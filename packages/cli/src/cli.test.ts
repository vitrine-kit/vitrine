import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initProject, suggestFeatures, PAYMENT_PROVIDER_FEATURES } from './init.js';
import { installFeatures, removeFeature } from './install.js';
import { loadProject } from './project.js';
import { createRegistrySource } from './registry.js';
import {
  activePaymentProvider,
  mergePackageDeps,
  renderBlueprintFile,
  renderFeaturesRegion,
  renderIntegrationsRegion,
  renderPaymentsFile,
  renderSlotsFile,
  type FeatureState,
} from './generate.js';
import {
  buildDesignPrompt,
  designApply,
  designHasInput,
  extractDesignInstruction,
  findClaudeBin,
} from './design.js';
import { runDoctor } from './doctor.js';
import { computeChangelog, populateCache, readKitMeta } from './cache.js';
import { kitStatus } from './kit-update.js';
import { merge3 } from './merge.js';
import { applyUpdate, planUpdate } from './update.js';
import { preflightNode, replaceBetween } from './util.js';

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

describe('init payload-шаблон (M5)', () => {
  it('скаффолдит base + backend-payload (zero-config + Docker) и стек в package.json', () => {
    const root = join(tmp(), 'shop');
    initProject({
      root,
      name: 'shop',
      backend: 'payload',
      tier: 'catalog',
      features: ['catalog', 'product-page', 'seo'],
      registry,
    });

    // статический каркас base
    expect(existsSync(join(root, 'app/(frontend)/page.tsx'))).toBe(true);
    expect(existsSync(join(root, 'tailwind.config.ts'))).toBe(true);
    expect(existsSync(join(root, '.gitignore'))).toBe(true);
    expect(existsSync(join(root, '.npmrc'))).toBe(true);

    // backend-payload: конфиг, адаптеры, zero-config, Docker
    expect(existsSync(join(root, 'payload.config.ts'))).toBe(true);
    expect(existsSync(join(root, 'lib/adapter/db.ts'))).toBe(true);
    expect(existsSync(join(root, 'lib/adapter/map.ts'))).toBe(true);
    expect(existsSync(join(root, 'lib/seed/demo.ts'))).toBe(true);
    expect(existsSync(join(root, 'seed-assets/placeholder-1.svg'))).toBe(true);
    expect(existsSync(join(root, 'app/(payload)/layout.tsx'))).toBe(true);
    expect(existsSync(join(root, 'Dockerfile'))).toBe(true);
    expect(existsSync(join(root, 'docker-compose.yml'))).toBe(true);

    // package.json — стек Next + Payload + dev-скрипт
    const pkg = JSON.parse(read(root, 'package.json'));
    expect(pkg.dependencies.next).toBeDefined();
    expect(pkg.dependencies.payload).toBeDefined();
    expect(pkg.dependencies['@maks417/payload-blueprint']).toBeDefined();
    expect(pkg.scripts.dev).toBe('next dev');

    // .env.example — ключи zero-config
    const env = read(root, '.env.example');
    expect(env).toContain('DATABASE_URL=');
    expect(env).toContain('PAYLOAD_SECRET=');

    // управляемые файлы по-прежнему консистентны
    expect(read(root, 'site.config.ts')).toContain('"catalog": true');
    expect(read(root, 'lib/slots.ts')).toContain('registerCatalogSlots');
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

describe('remove атомарен', () => {
  function soloReg(): string {
    const dir = mkdtempSync(join(tmpdir(), 'vitrine-reg-'));
    tmps.push(dir);
    writeFileSync(
      join(dir, '_index.json'),
      JSON.stringify({
        kitVersion: '0.0.0',
        contracts: '1.0.0',
        features: { solo: { title: 'Solo', kitVersion: '0.0.0', tier: ['catalog'] } },
      }),
    );
    mkdirSync(join(dir, 'solo', 'files', 'lib', 'solo'), { recursive: true });
    writeFileSync(join(dir, 'solo', 'files', 'lib', 'solo', 'x.ts'), 'export const x = 1;\n');
    writeFileSync(
      join(dir, 'solo', 'feature.json'),
      JSON.stringify({
        name: 'solo', title: 'Solo', kitVersion: '0.0.0', requiresContracts: '>=1.0.0', tier: ['catalog'],
        files: [{ from: 'files/lib/solo/', to: 'lib/solo/' }],
        config: { set: { 'features.solo': true } }, removable: true,
      }),
    );
    return dir;
  }

  it('падение регенерации при remove откатывает удаление файлов и лок', () => {
    const reg = createRegistrySource(soloReg());
    const root = join(tmp(), 'shop');
    initProject({ root, name: 'shop', backend: 'payload', tier: 'catalog', features: ['solo'], registry: reg });
    expect(existsSync(join(root, 'lib/solo/x.ts'))).toBe(true);
    expect(existsSync(join(root, '.vitrine/originals/solo@0.0.0/lib/solo/x.ts'))).toBe(true);

    // Ломаем маркеры site.config → regenerateDerived (replaceBetween) бросит уже ПОСЛЕ
    // того, как файлы фичи удалены транзакцией.
    writeFileSync(
      join(root, 'site.config.ts'),
      read(root, 'site.config.ts').replace('// vitrine:features:start', '// broken'),
    );

    const project = loadProject(root);
    expect(() => removeFeature(project, 'solo', reg)).toThrow();

    // файлы и pristine восстановлены, лок (в памяти и на диске) не тронут
    expect(existsSync(join(root, 'lib/solo/x.ts'))).toBe(true);
    expect(existsSync(join(root, '.vitrine/originals/solo@0.0.0/lib/solo/x.ts'))).toBe(true);
    expect(project.lock.features.solo).toBeDefined();
    expect(JSON.parse(read(root, 'vitrine.json')).features.solo).toBeDefined();
  });
});

describe('remove удаляет только файлы фичи (общий app/, P0)', () => {
  it('remove checkout-stripe не трогает файлы checkout/cart и базового шаблона', () => {
    const root = join(tmp(), 'shop');
    initProject({
      root, name: 'shop', backend: 'payload', tier: 'simple-store',
      features: ['cart', 'checkout-stripe'], registry,
    });
    // checkout-stripe тянет checkout (→ cart); все мапят files/app/ → app/
    expect(existsSync(join(root, 'app/api/webhooks/stripe/route.ts'))).toBe(true); // checkout-stripe
    expect(existsSync(join(root, 'lib/checkout-stripe/provider.ts'))).toBe(true);
    expect(existsSync(join(root, 'app/api/checkout/route.ts'))).toBe(true); // checkout (зависимость)
    expect(existsSync(join(root, 'app/(frontend)/cart/page.tsx'))).toBe(true);
    expect(existsSync(join(root, 'app/(frontend)/page.tsx'))).toBe(true); // базовый шаблон

    removeFeature(loadProject(root), 'checkout-stripe', registry);

    // удалены РОВНО файлы checkout-stripe
    expect(existsSync(join(root, 'app/api/webhooks/stripe/route.ts'))).toBe(false);
    expect(existsSync(join(root, 'lib/checkout-stripe/provider.ts'))).toBe(false);
    expect(existsSync(join(root, '.vitrine/originals/checkout-stripe@0.0.0/app/api/webhooks/stripe/route.ts'))).toBe(false);
    // checkout (родительская зависимость), cart и базовый шаблон уцелели
    expect(existsSync(join(root, 'app/api/checkout/route.ts'))).toBe(true);
    expect(existsSync(join(root, 'components/checkout/CheckoutButton.tsx'))).toBe(true);
    expect(existsSync(join(root, 'app/(frontend)/cart/page.tsx'))).toBe(true);
    expect(existsSync(join(root, 'app/api/cart/route.ts'))).toBe(true);
    expect(existsSync(join(root, 'app/(frontend)/page.tsx'))).toBe(true);
  });
});

describe('платёжные провайдеры (мульти-провайдер)', () => {
  it('install checkout-stripe тянет checkout/cart и ставит провайдера', () => {
    const root = join(tmp(), 'shop');
    initProject({
      root, name: 'shop', backend: 'payload', tier: 'simple-store',
      features: ['checkout-stripe'], registry,
    });
    // зависимости подтянулись (checkout-stripe → checkout → cart)
    const lock = JSON.parse(read(root, 'vitrine.json'));
    expect(Object.keys(lock.features).sort()).toEqual(['cart', 'checkout', 'checkout-stripe']);
    // активный провайдер в site.config (управляемый регион integrations)
    expect(read(root, 'site.config.ts')).toContain('payments: "stripe"');
    // регистрация провайдера в lib/payments.ts
    const payments = read(root, 'lib/payments.ts');
    expect(payments).toContain('registerCheckoutStripeProvider');
    expect(payments).toContain('./checkout-stripe/register.js');
    // кнопка оформления — слот из generic checkout
    expect(read(root, 'lib/slots.ts')).toContain('registerCheckoutSlots');
    // env Stripe домержен
    expect(read(root, '.env.example')).toContain('STRIPE_SECRET_KEY=');
  });

  it('мастер: провайдеры есть в реестре и исключаются из общего списка фич', () => {
    for (const f of PAYMENT_PROVIDER_FEATURES) expect(registry.hasFeature(f)).toBe(true);
    // baseline мультиселекта = подсказанные фичи минус провайдеры (их выбирают отдельным шагом)
    const baseline = suggestFeatures('simple-store', registry, 'payload').filter(
      (f) => !PAYMENT_PROVIDER_FEATURES.includes(f),
    );
    expect(baseline).toContain('cart');
    expect(baseline).not.toContain('checkout-stripe');
  });

  it('провайдеры взаимоисключающи: paddle при установленном stripe → конфликт', () => {
    const root = join(tmp(), 'shop');
    initProject({
      root, name: 'shop', backend: 'payload', tier: 'simple-store',
      features: ['checkout-stripe'], registry,
    });
    const project = loadProject(root);
    expect(() => installFeatures(project, ['checkout-paddle'], registry)).toThrow(/конфликт/);
  });

  it('yookassa: integrations.payments и регистрация провайдера', () => {
    const root = join(tmp(), 'shop');
    initProject({
      root, name: 'shop', backend: 'payload', tier: 'simple-store',
      features: ['checkout-yookassa'], registry,
    });
    expect(read(root, 'site.config.ts')).toContain('payments: "yookassa"');
    expect(read(root, 'lib/payments.ts')).toContain('registerCheckoutYookassaProvider');
    // doctor доволен консистентным проектом
    expect(runDoctor(loadProject(root), registry).ok).toBe(true);
  });
});

describe('design apply (M6)', () => {
  function scaffold(features: string[] = ['catalog']): string {
    const root = join(tmp(), 'shop');
    initProject({ root, name: 'shop', backend: 'payload', tier: 'catalog', features, registry });
    return root;
  }

  it('findClaudeBin: явный путь — существующий возвращается, отсутствующий бросает', () => {
    expect(findClaudeBin(process.execPath)).toBe(process.execPath);
    expect(() => findClaudeBin(join(tmp(), 'nope', 'claude'))).toThrow(/не найден/);
  });

  it('designHasInput: только README → false; добавили файл → true', () => {
    const root = scaffold();
    expect(designHasInput(root)).toBe(false); // в base только design/README.md
    writeFileSync(join(root, 'design', 'tokens.json'), '{}');
    expect(designHasInput(root)).toBe(true);
  });

  it('extractDesignInstruction вытаскивает блок §11, без соседних разделов', () => {
    const md = read(scaffold(), 'CLAUDE.md');
    const instr = extractDesignInstruction(md);
    expect(instr).toContain('ИНСТРУКЦИЯ: применить дизайн');
    expect(instr).not.toContain('## Установленные фичи');
  });

  it('buildDesignPrompt включает инструкцию, целевой файл и набор токенов', () => {
    const project = loadProject(scaffold());
    const prompt = buildDesignPrompt(project);
    expect(prompt).toContain('theme/client.css');
    expect(prompt).toContain('--vt-color-primary');
    expect(prompt).toContain('ИНСТРУКЦИЯ');
  });

  it('designApply шеллит в Claude Code с -p и cwd проекта (через stub-runner)', () => {
    const root = scaffold();
    writeFileSync(join(root, 'design', 'export.css'), ':root{}');
    const project = loadProject(root);
    const calls: { bin: string; args: string[]; cwd: string; prompt: string }[] = [];
    const code = designApply(project, { bin: process.execPath }, (cmd) => {
      calls.push(cmd);
      return 0;
    });
    expect(code).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.args).toContain('-p');
    expect(calls[0]?.args).toContain('acceptEdits');
    expect(calls[0]?.cwd).toBe(root);
    expect(calls[0]?.prompt).toContain('--vt-color-primary');
  });

  it('designApply бросает на пустой design/ (нечего применять)', () => {
    const project = loadProject(scaffold());
    expect(() => designApply(project, { bin: process.execPath }, () => 0)).toThrow(/пуста/);
  });
});

describe('doctor (M7)', () => {
  // Синтетический реестр с фичей, объявляющей files+env+npm+slots — для контроля рассинхрона.
  function featureRegistry(): string {
    const dir = mkdtempSync(join(tmpdir(), 'vitrine-reg-'));
    tmps.push(dir);
    writeFileSync(
      join(dir, '_index.json'),
      JSON.stringify({
        kitVersion: '0.0.0',
        contracts: '1.0.0',
        features: { demo: { title: 'Demo', kitVersion: '0.0.0', tier: ['catalog'] } },
      }),
    );
    mkdirSync(join(dir, 'demo', 'files', 'lib', 'demo'), { recursive: true });
    writeFileSync(join(dir, 'demo', 'files', 'lib', 'demo', 'register.ts'), 'export function registerDemoSlots() {}\n');
    writeFileSync(
      join(dir, 'demo', 'feature.json'),
      JSON.stringify({
        name: 'demo', title: 'Demo', kitVersion: '0.0.0', requiresContracts: '>=1.0.0', tier: ['catalog'],
        corePackages: { '@maks417/core': '>=0.1.0' }, npm: ['zod@^3'],
        files: [{ from: 'files/lib/demo/', to: 'lib/demo/' }],
        config: { set: { 'features.demo': true } },
        slots: [{ slot: 'home.hero', component: 'DemoHero', order: 10 }],
        env: [{ key: 'DEMO_KEY', required: true }],
        removable: true,
      }),
    );
    return dir;
  }

  it('чистый проект — без проблем', () => {
    const reg = createRegistrySource(featureRegistry());
    const root = join(tmp(), 'shop');
    initProject({ root, name: 'shop', backend: 'payload', tier: 'catalog', features: ['demo'], registry: reg });
    const report = runDoctor(loadProject(root), reg);
    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('ловит рассинхрон: удалённый файл, пропавший env, пропавшая зависимость, версия не та', () => {
    const reg = createRegistrySource(featureRegistry());
    const root = join(tmp(), 'shop');
    initProject({ root, name: 'shop', backend: 'payload', tier: 'catalog', features: ['demo'], registry: reg });

    rmSync(join(root, 'lib/demo/register.ts'));
    writeFileSync(join(root, '.env.example'), read(root, '.env.example').replace(/DEMO_KEY=?/g, ''));
    const pkg = JSON.parse(read(root, 'package.json'));
    delete pkg.dependencies.zod;
    writeFileSync(join(root, 'package.json'), JSON.stringify(pkg, null, 2));
    const lock = JSON.parse(read(root, 'vitrine.json'));
    lock.features.demo.version = '9.9.9';
    writeFileSync(join(root, 'vitrine.json'), JSON.stringify(lock, null, 2));

    const report = runDoctor(loadProject(root), reg);
    const msgs = report.issues.map((i) => i.message).join('\n');
    expect(report.ok).toBe(false); // есть error-уровень
    expect(msgs).toMatch(/нет файла "lib\/demo\/register\.ts"/);
    expect(msgs).toMatch(/DEMO_KEY/);
    expect(msgs).toMatch(/zod/);
    expect(msgs).toMatch(/версия в репо 9\.9\.9/);
  });
});

describe('kit cache (M7)', () => {
  const repoRoot = join(here, '..', '..', '..'); // монорепо: registry/ + templates/

  it('populateCache наполняет ~/.vitrine (registry + templates) и пишет meta', () => {
    const home = tmp();
    const res = populateCache(repoRoot, { home });
    expect(existsSync(join(home, 'registry', '_index.json'))).toBe(true);
    expect(existsSync(join(home, 'templates', 'base', 'files', 'app', '(frontend)', 'layout.tsx'))).toBe(true);
    expect(readKitMeta(home)?.kitVersion).toBeDefined();
    expect(res.changelog.length).toBeGreaterThan(0);
    expect(res.changelog.every((e) => e.kind === 'added')).toBe(true); // первый прогон
  });

  it('повторный populateCache — без изменений набора фич', () => {
    const home = tmp();
    populateCache(repoRoot, { home });
    expect(populateCache(repoRoot, { home }).changelog).toEqual([]);
  });

  it('kitStatus читает кэш', () => {
    const home = tmp();
    expect(kitStatus(home).cached).toBe(false);
    populateCache(repoRoot, { home });
    const s = kitStatus(home);
    expect(s.cached).toBe(true);
    expect(s.featureCount).toBeGreaterThanOrEqual(3);
  });

  it('offline init из кэша (DoD): VITRINE_HOME → реестр и шаблоны из ~/.vitrine', () => {
    const home = tmp();
    populateCache(repoRoot, { home });
    const prev = process.env.VITRINE_HOME;
    process.env.VITRINE_HOME = home;
    try {
      const reg = createRegistrySource(); // без explicit → должен взять кэш
      expect(reg.root).toBe(join(home, 'registry'));
      const root = join(tmp(), 'shop');
      initProject({ root, name: 'shop', backend: 'payload', tier: 'catalog', features: ['catalog'], registry: reg });
      expect(existsSync(join(root, 'components/catalog/ProductCard.tsx'))).toBe(true);
      expect(existsSync(join(root, 'payload.config.ts'))).toBe(true); // шаблоны тоже из кэша
    } finally {
      if (prev === undefined) delete process.env.VITRINE_HOME;
      else process.env.VITRINE_HOME = prev;
    }
  });

  it('computeChangelog: added / removed / changed', () => {
    const cl = computeChangelog(
      { features: { x: { kitVersion: '1.0.0' }, y: { kitVersion: '1.0.0' } } },
      { features: { x: { kitVersion: '1.1.0' }, z: { kitVersion: '1.0.0' } } },
    );
    expect(cl).toContainEqual({ kind: 'changed', name: 'x', from: '1.0.0', to: '1.1.0' });
    expect(cl).toContainEqual({ kind: 'added', name: 'z', to: '1.0.0' });
    expect(cl).toContainEqual({ kind: 'removed', name: 'y', from: '1.0.0' });
  });
});

describe('init vendure / переносимость (M10)', () => {
  it('full-store → vendure: backend-vendure + та же витрина и фичи, без Payload', () => {
    const root = join(tmp(), 'shop');
    initProject({
      root,
      name: 'shop',
      backend: 'vendure',
      tier: 'full-store',
      features: ['catalog', 'product-page', 'seo', 'cart'],
      registry,
    });

    // vendure-специфичное
    expect(existsSync(join(root, 'vendure-config.ts'))).toBe(true);
    expect(existsSync(join(root, 'src/index.ts'))).toBe(true);
    expect(existsSync(join(root, 'lib/adapter/vendure-catalog.ts'))).toBe(true);
    expect(existsSync(join(root, 'lib/adapter/map.ts'))).toBe(true);
    // НЕ Payload
    expect(existsSync(join(root, 'payload.config.ts'))).toBe(false);

    // переносимость: те же витрина (base) и компоненты каталога/корзины, что и на Payload
    expect(existsSync(join(root, 'app/(frontend)/page.tsx'))).toBe(true);
    expect(existsSync(join(root, 'components/catalog/ProductGrid.tsx'))).toBe(true);
    expect(existsSync(join(root, 'components/cart/CartView.tsx'))).toBe(true);

    const pkg = JSON.parse(read(root, 'package.json'));
    expect(pkg.dependencies['@vendure/core']).toBeDefined();
    expect(pkg.dependencies.payload).toBeUndefined();
    expect(pkg.scripts.vendure).toBe('tsx src/index.ts');
  });

  it('suggestFeatures: vendure full-store без checkout-stripe, payload simple-store — с ним', () => {
    const v = suggestFeatures('full-store', registry, 'vendure');
    expect(v).toContain('cart');
    expect(v).not.toContain('checkout-stripe');
    expect(suggestFeatures('simple-store', registry, 'payload')).toContain('checkout-stripe');
  });
});

describe('merge3 (3-way, M9)', () => {
  it('theirs-only изменение → берём theirs', () => {
    const r = merge3('a\nb\nc', 'a\nb\nc', 'a\nb\nc\nd');
    expect(r.clean).toBe(true);
    expect(r.text).toBe('a\nb\nc\nd');
  });

  it('ours-only изменение → сохраняем ours (правка клиента)', () => {
    const r = merge3('a\nb', 'a\nZ', 'a\nb');
    expect(r.clean).toBe(true);
    expect(r.text).toBe('a\nZ');
  });

  it('оба изменили одинаково → чисто', () => {
    const r = merge3('a\nb', 'a\nQ', 'a\nQ');
    expect(r.clean).toBe(true);
    expect(r.text).toBe('a\nQ');
  });

  it('непересекающиеся изменения → оба применены', () => {
    const r = merge3('a\nb\nc\nd\ne', 'A\nb\nc\nd\ne', 'a\nb\nc\nd\nE');
    expect(r.clean).toBe(true);
    expect(r.text).toBe('A\nb\nc\nd\nE');
  });

  it('вставки на разных концах → обе применены', () => {
    const r = merge3('l1\nl2\nl3', 'HEAD\nl1\nl2\nl3', 'l1\nl2\nl3\nTAIL');
    expect(r.clean).toBe(true);
    expect(r.text).toBe('HEAD\nl1\nl2\nl3\nTAIL');
  });

  it('пересекающиеся разные изменения → конфликт с маркерами', () => {
    const r = merge3('a\nb\nc', 'a\nX\nc', 'a\nY\nc');
    expect(r.clean).toBe(false);
    expect(r.conflicts).toBe(1);
    expect(r.text).toContain('<<<<<<<');
    expect(r.text).toContain('X');
    expect(r.text).toContain('=======');
    expect(r.text).toContain('Y');
    expect(r.text).toContain('>>>>>>>');
  });
});

describe('vitrine update (M9)', () => {
  function demoReg(version: string, content: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'vitrine-reg-'));
    tmps.push(dir);
    writeFileSync(
      join(dir, '_index.json'),
      JSON.stringify({ kitVersion: version, contracts: '1.0.0', features: { demo: { title: 'Demo', kitVersion: version, tier: ['catalog'] } } }),
    );
    mkdirSync(join(dir, 'demo', 'files', 'lib', 'demo'), { recursive: true });
    writeFileSync(join(dir, 'demo', 'files', 'lib', 'demo', 'x.ts'), content);
    writeFileSync(
      join(dir, 'demo', 'feature.json'),
      JSON.stringify({
        name: 'demo', title: 'Demo', kitVersion: version, requiresContracts: '>=1.0.0', tier: ['catalog'],
        files: [{ from: 'files/lib/demo/', to: 'lib/demo/' }],
        config: { set: { 'features.demo': true } },
      }),
    );
    return dir;
  }

  function setup(v1Content: string): string {
    const v1 = createRegistrySource(demoReg('0.0.0', v1Content));
    const root = join(tmp(), 'shop');
    initProject({ root, name: 'shop', backend: 'payload', tier: 'catalog', features: ['demo'], registry: v1 });
    return root;
  }

  it('3-way merge сохраняет правки клиента и вливает новое из реестра', () => {
    const root = setup('line1\nline2\nline3\n');
    writeFileSync(join(root, 'lib/demo/x.ts'), 'CLIENT1\nline2\nline3\n'); // клиент стилизовал line1
    const v2 = createRegistrySource(demoReg('0.1.0', 'line1\nline2\nTHEIRS3\n')); // реестр сменил line3
    const project = loadProject(root);

    const plan = planUpdate(project, 'demo', v2);
    expect(plan.toVersion).toBe('0.1.0');
    expect(plan.hasConflicts).toBe(false);
    applyUpdate(project, plan, v2);

    const merged = read(root, 'lib/demo/x.ts');
    expect(merged).toContain('CLIENT1'); // правка клиента сохранена
    expect(merged).toContain('THEIRS3'); // новое из реестра влито
    expect(merged).not.toContain('line1');
    expect(JSON.parse(read(root, 'vitrine.json')).features.demo.version).toBe('0.1.0');
    expect(existsSync(join(root, '.vitrine/originals/demo@0.1.0/lib/demo/x.ts'))).toBe(true);
    expect(existsSync(join(root, '.vitrine/originals/demo@0.0.0'))).toBe(false); // старый pristine снят
  });

  it('конфликт помечается git-маркерами', () => {
    const root = setup('a\nb\nc\n');
    writeFileSync(join(root, 'lib/demo/x.ts'), 'a\nCLIENT\nc\n');
    const v2 = createRegistrySource(demoReg('0.1.0', 'a\nREGISTRY\nc\n'));
    const project = loadProject(root);

    const plan = planUpdate(project, 'demo', v2);
    expect(plan.hasConflicts).toBe(true);
    applyUpdate(project, plan, v2);

    const merged = read(root, 'lib/demo/x.ts');
    expect(merged).toContain('<<<<<<<');
    expect(merged).toContain('CLIENT');
    expect(merged).toContain('REGISTRY');
  });

  it('diff (planUpdate) не пишет файлы', () => {
    const root = setup('a\nb\n');
    writeFileSync(join(root, 'lib/demo/x.ts'), 'a\nZZ\n');
    const v2 = createRegistrySource(demoReg('0.1.0', 'a\nb\nc\n'));
    const before = read(root, 'lib/demo/x.ts');
    const plan = planUpdate(loadProject(root), 'demo', v2);
    expect(plan.changed).toBe(true);
    expect(read(root, 'lib/demo/x.ts')).toBe(before);
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

  it('renderPaymentsFile зовёт register<Name>Provider только для платёжных фич', () => {
    const provider: FeatureState = {
      name: 'checkout-stripe', version: '0.0.0',
      manifest: fakeManifest({ payment: { provider: 'stripe' } }),
    };
    const noPayment: FeatureState = { name: 'cart', version: '0.0.0', manifest: fakeManifest() };
    const out = renderPaymentsFile([provider, noPayment]);
    expect(out).toContain('registerCheckoutStripeProvider');
    expect(out).toContain('./checkout-stripe/register.js');
    expect(out).not.toContain('registerCartProvider');
  });

  it('activePaymentProvider/renderIntegrationsRegion берут провайдера из блока payment', () => {
    const states: FeatureState[] = [
      { name: 'cart', version: '0.0.0', manifest: fakeManifest() },
      { name: 'checkout-yookassa', version: '0.0.0', manifest: fakeManifest({ payment: { provider: 'yookassa' } }) },
    ];
    expect(activePaymentProvider(states)).toBe('yookassa');
    expect(renderIntegrationsRegion(states)).toContain('payments: "yookassa"');
    // без платёжных фич — пустой объект
    expect(renderIntegrationsRegion([{ name: 'cart', version: '0.0.0', manifest: fakeManifest() }])).toBe(
      '  integrations: {},',
    );
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

  it('preflightNode: ниже минимума бросает, на текущем рантайме — нет', () => {
    expect(() => preflightNode(99)).toThrow(/нужен Node >= 99/);
    expect(() => preflightNode(1)).not.toThrow();
  });
});
