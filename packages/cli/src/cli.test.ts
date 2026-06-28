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
import { KIT_VERSION, CORE_RANGE, BLUEPRINT_RANGE } from './kit.js';

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

describe('init + install primitive (DoD)', () => {
  it('catalog init installs catalog/product-page/seo and writes everything consistently', () => {
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

    // files copied
    expect(existsSync(join(root, 'components/catalog/ProductCard.tsx'))).toBe(true);
    expect(existsSync(join(root, 'components/product/ProductView.tsx'))).toBe(true);
    expect(existsSync(join(root, 'lib/seo/metadata.ts'))).toBe(true);

    // vitrine.json
    const lock = JSON.parse(read(root, 'vitrine.json'));
    expect(Object.keys(lock.features).sort()).toEqual(['catalog', 'product-page', 'seo']);

    // flags in site.config
    const config = read(root, 'site.config.ts');
    expect(config).toContain('"catalog": true');
    expect(config).toContain('"seo": true');

    // slots: catalog registers its own register
    const slots = read(root, 'lib/slots.ts');
    expect(slots).toContain('registerCatalogSlots');

    // CLAUDE.md table
    expect(read(root, 'CLAUDE.md')).toContain('| `catalog` |');

    // pristine snapshots for 3-way merge
    expect(existsSync(join(root, '.vitrine/originals/catalog@0.0.0/components/catalog/ProductCard.tsx'))).toBe(true);
  });

  it('scaffolds agent artifacts: reference in CLAUDE.md, slash commands, AGENTS.md', () => {
    const root = join(tmp(), 'shop');
    initProject({ root, name: 'shop', backend: 'payload', tier: 'catalog', features: ['catalog'], registry });

    // extended CLAUDE.md: command reference + boundaries, design block and feature table present
    const claude = read(root, 'CLAUDE.md');
    expect(claude).toContain('## vitrine CLI commands');
    expect(claude).toContain('vitrine add');
    expect(claude).toContain('vitrine doctor');
    expect(claude).toContain('## Boundaries');
    expect(claude).toContain('INSTRUCTION: apply the design'); // doctor/design contract preserved
    expect(claude).toContain('| `catalog` |'); // managed feature table

    // Claude Code slash commands (static from templates/base)
    for (const cmd of ['setup', 'add-feature', 'design', 'update', 'doctor']) {
      expect(existsSync(join(root, '.claude/commands', `${cmd}.md`))).toBe(true);
    }

    // AGENTS.md for cross-tool agents, linking to the canonical CLAUDE.md
    expect(existsSync(join(root, 'AGENTS.md'))).toBe(true);
    expect(read(root, 'AGENTS.md')).toContain('CLAUDE.md');
  });

  it('README is generated backend-aware (Payload) with a full lifecycle', () => {
    const root = join(tmp(), 'shop');
    initProject({ root, name: 'shop', backend: 'payload', tier: 'catalog', features: ['catalog'], registry });
    const readme = read(root, 'README.md');
    // run/deploy are Payload-specific
    expect(readme).toContain('http://localhost:3000/admin');
    expect(readme).toContain('PAYLOAD_SECRET');
    expect(readme).not.toContain('pnpm vendure');
    // feature/update lifecycle (not just init→dev→deploy)
    expect(readme).toContain('vitrine add');
    expect(readme).toContain('vitrine update');
    expect(readme).toContain('vitrine doctor');
  });

  it('README is generated backend-aware (Vendure) — without Payload instructions', () => {
    const root = join(tmp(), 'shop');
    initProject({ root, name: 'shop', backend: 'vendure', tier: 'full-store', features: [], registry });
    const readme = read(root, 'README.md');
    expect(readme).toContain('pnpm vendure');
    expect(readme).toContain('VENDURE_');
    expect(readme).not.toContain('PAYLOAD_SECRET');
    expect(readme).not.toContain('/admin');
  });

  it('re-adding the same version — no-op', () => {
    const root = join(tmp(), 'shop');
    initProject({ root, name: 'shop', backend: 'payload', tier: 'catalog', features: ['catalog'], registry });
    const before = read(root, 'site.config.ts');
    const project = loadProject(root);
    const res = installFeatures(project, ['catalog'], registry);
    expect(res.installed).toEqual([]);
    expect(read(root, 'site.config.ts')).toBe(before);
  });

  it('add pulls registryDependencies (product-page → catalog)', () => {
    const root = join(tmp(), 'shop');
    initProject({ root, name: 'shop', backend: 'payload', tier: 'catalog', features: [], registry });
    const project = loadProject(root);
    const res = installFeatures(project, ['product-page'], registry);
    expect(res.installed).toEqual(['catalog', 'product-page']); // dependency first
    expect(existsSync(join(root, 'components/catalog/ProductCard.tsx'))).toBe(true);
  });

  it('removable: false cannot be removed', () => {
    const root = join(tmp(), 'shop');
    initProject({ root, name: 'shop', backend: 'payload', tier: 'catalog', features: ['catalog'], registry });
    const project = loadProject(root);
    expect(() => removeFeature(project, 'catalog', registry)).toThrow(/is not removable/);
  });
});

describe('init payload template', () => {
  it('scaffolds base + backend-payload (zero-config + Docker) and the stack in package.json', () => {
    const root = join(tmp(), 'shop');
    initProject({
      root,
      name: 'shop',
      backend: 'payload',
      tier: 'catalog',
      features: ['catalog', 'product-page', 'seo'],
      registry,
    });

    // static base skeleton
    expect(existsSync(join(root, 'app/(frontend)/page.tsx'))).toBe(true);
    expect(existsSync(join(root, 'tailwind.config.ts'))).toBe(true);
    expect(existsSync(join(root, '.gitignore'))).toBe(true);
    expect(existsSync(join(root, '.npmrc'))).toBe(false); // public npm — client .npmrc not needed

    // backend-payload: config, adapters, zero-config, Docker
    expect(existsSync(join(root, 'payload.config.ts'))).toBe(true);
    expect(existsSync(join(root, 'lib/adapter/db.ts'))).toBe(true);
    expect(existsSync(join(root, 'lib/adapter/map.ts'))).toBe(true);
    expect(existsSync(join(root, 'lib/seed/demo.ts'))).toBe(true);
    expect(existsSync(join(root, 'seed-assets/placeholder-1.svg'))).toBe(true);
    expect(existsSync(join(root, 'app/(payload)/layout.tsx'))).toBe(true);
    expect(existsSync(join(root, 'Dockerfile'))).toBe(true);
    expect(existsSync(join(root, 'docker-compose.yml'))).toBe(true);

    // package.json — Next + Payload stack + dev script
    const pkg = JSON.parse(read(root, 'package.json'));
    expect(pkg.dependencies.next).toBeDefined();
    expect(pkg.dependencies.payload).toBeDefined();
    expect(pkg.dependencies['@vitrine-kit/payload-blueprint']).toBeDefined();
    expect(pkg.scripts.dev).toBe('next dev');

    // .env.example — zero-config keys
    const env = read(root, '.env.example');
    expect(env).toContain('DATABASE_URL=');
    expect(env).toContain('PAYLOAD_SECRET=');

    // managed files are still consistent
    expect(read(root, 'site.config.ts')).toContain('"catalog": true');
    expect(read(root, 'lib/slots.ts')).toContain('registerCatalogSlots');
  });
});

describe('rollback on error', () => {
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

  it('failure on feature N rolls back what was already copied', () => {
    const reg = createRegistrySource(brokenRegistry());
    const root = join(tmp(), 'shop');
    initProject({ root, name: 'shop', backend: 'payload', tier: 'catalog', features: [], registry: reg });
    const project = loadProject(root);

    expect(() => installFeatures(project, ['good', 'bad'], reg)).toThrow(/no source/);
    // good was copied first, but bad failed → everything rolled back
    expect(existsSync(join(root, 'lib/good/x.ts'))).toBe(false);
    expect(project.lock.features.good).toBeUndefined();
    expect(JSON.parse(read(root, 'vitrine.json')).features).toEqual({});
  });
});

describe('remove is atomic', () => {
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

  it('a regeneration failure during remove rolls back file deletion and the lock', () => {
    const reg = createRegistrySource(soloReg());
    const root = join(tmp(), 'shop');
    initProject({ root, name: 'shop', backend: 'payload', tier: 'catalog', features: ['solo'], registry: reg });
    expect(existsSync(join(root, 'lib/solo/x.ts'))).toBe(true);
    expect(existsSync(join(root, '.vitrine/originals/solo@0.0.0/lib/solo/x.ts'))).toBe(true);

    // Break the site.config markers → regenerateDerived (replaceBetween) will throw AFTER
    // the feature files are already removed by the transaction.
    writeFileSync(
      join(root, 'site.config.ts'),
      read(root, 'site.config.ts').replace('// vitrine:features:start', '// broken'),
    );

    const project = loadProject(root);
    expect(() => removeFeature(project, 'solo', reg)).toThrow();

    // files and pristine restored, the lock (in memory and on disk) untouched
    expect(existsSync(join(root, 'lib/solo/x.ts'))).toBe(true);
    expect(existsSync(join(root, '.vitrine/originals/solo@0.0.0/lib/solo/x.ts'))).toBe(true);
    expect(project.lock.features.solo).toBeDefined();
    expect(JSON.parse(read(root, 'vitrine.json')).features.solo).toBeDefined();
  });
});

describe('remove deletes only the feature files (shared app/, P0)', () => {
  it('remove checkout-stripe does not touch checkout/cart and base template files', () => {
    const root = join(tmp(), 'shop');
    initProject({
      root, name: 'shop', backend: 'payload', tier: 'simple-store',
      features: ['cart', 'checkout-stripe'], registry,
    });
    // checkout-stripe pulls checkout (→ cart); all map files/app/ → app/
    expect(existsSync(join(root, 'app/api/webhooks/stripe/route.ts'))).toBe(true); // checkout-stripe
    expect(existsSync(join(root, 'lib/checkout-stripe/provider.ts'))).toBe(true);
    expect(existsSync(join(root, 'app/api/checkout/route.ts'))).toBe(true); // checkout (dependency)
    expect(existsSync(join(root, 'app/(frontend)/cart/page.tsx'))).toBe(true);
    expect(existsSync(join(root, 'app/(frontend)/page.tsx'))).toBe(true); // base template

    removeFeature(loadProject(root), 'checkout-stripe', registry);

    // EXACTLY the checkout-stripe files were removed
    expect(existsSync(join(root, 'app/api/webhooks/stripe/route.ts'))).toBe(false);
    expect(existsSync(join(root, 'lib/checkout-stripe/provider.ts'))).toBe(false);
    expect(existsSync(join(root, '.vitrine/originals/checkout-stripe@0.0.0/app/api/webhooks/stripe/route.ts'))).toBe(false);
    // checkout (parent dependency), cart and the base template survived
    expect(existsSync(join(root, 'app/api/checkout/route.ts'))).toBe(true);
    expect(existsSync(join(root, 'components/checkout/CheckoutButton.tsx'))).toBe(true);
    expect(existsSync(join(root, 'app/(frontend)/cart/page.tsx'))).toBe(true);
    expect(existsSync(join(root, 'app/api/cart/route.ts'))).toBe(true);
    expect(existsSync(join(root, 'app/(frontend)/page.tsx'))).toBe(true);
  });
});

describe('payment providers (multi-provider)', () => {
  it('install checkout-stripe pulls checkout/cart and installs the provider', () => {
    const root = join(tmp(), 'shop');
    initProject({
      root, name: 'shop', backend: 'payload', tier: 'simple-store',
      features: ['checkout-stripe'], registry,
    });
    // dependencies were pulled in (checkout-stripe → checkout → cart)
    const lock = JSON.parse(read(root, 'vitrine.json'));
    expect(Object.keys(lock.features).sort()).toEqual(['cart', 'checkout', 'checkout-stripe']);
    // active provider in site.config (managed integrations region)
    expect(read(root, 'site.config.ts')).toContain('payments: "stripe"');
    // provider registration in lib/payments.ts
    const payments = read(root, 'lib/payments.ts');
    expect(payments).toContain('registerCheckoutStripeProvider');
    expect(payments).toContain('./checkout-stripe/register.js');
    // the checkout button is a slot from the generic checkout
    expect(read(root, 'lib/slots.ts')).toContain('registerCheckoutSlots');
    // Stripe env merged in
    expect(read(root, '.env.example')).toContain('STRIPE_SECRET_KEY=');
  });

  it('generated client wires cart/checkout API routes and the Stripe webhook', () => {
    const root = join(tmp(), 'shop');
    initProject({
      root, name: 'shop', backend: 'payload', tier: 'simple-store',
      features: ['cart', 'checkout', 'checkout-stripe'], registry,
    });
    const cartRoute = read(root, 'app/api/cart/route.ts');
    expect(cartRoute).toContain('export async function POST');
    expect(cartRoute).toContain('export async function PATCH');
    expect(cartRoute).toContain('export async function DELETE');
    expect(read(root, 'app/api/checkout/route.ts')).toContain('export async function POST');
    const webhook = read(root, 'app/api/webhooks/stripe/route.ts');
    expect(webhook).toContain('export async function POST');
    expect(webhook).toContain('handlePaymentWebhook');
    expect(webhook).toContain('fulfillOrderFromEvent');
    expect(read(root, 'lib/adapter/index.ts')).toContain('registerPayments()');
  });

  it('wizard: providers exist in the registry and are excluded from the general feature list', () => {
    for (const f of PAYMENT_PROVIDER_FEATURES) expect(registry.hasFeature(f)).toBe(true);
    // multiselect baseline = suggested features minus providers (chosen in a separate step)
    const baseline = suggestFeatures('simple-store', registry, 'payload').filter(
      (f) => !PAYMENT_PROVIDER_FEATURES.includes(f),
    );
    expect(baseline).toContain('cart');
    expect(baseline).not.toContain('checkout-stripe');
  });

  it('providers are mutually exclusive: paddle with stripe installed → conflict', () => {
    const root = join(tmp(), 'shop');
    initProject({
      root, name: 'shop', backend: 'payload', tier: 'simple-store',
      features: ['checkout-stripe'], registry,
    });
    const project = loadProject(root);
    expect(() => installFeatures(project, ['checkout-paddle'], registry)).toThrow(/conflict/);
  });

  it('paddle: integrations.payments, provider registration and env', () => {
    const root = join(tmp(), 'shop');
    initProject({
      root, name: 'shop', backend: 'payload', tier: 'simple-store',
      features: ['checkout-paddle'], registry,
    });
    expect(read(root, 'site.config.ts')).toContain('payments: "paddle"');
    const payments = read(root, 'lib/payments.ts');
    expect(payments).toContain('registerCheckoutPaddleProvider');
    expect(payments).toContain('./checkout-paddle/register.js');
    expect(read(root, '.env.example')).toContain('PADDLE_API_KEY=');
    // doctor is happy with a consistent project
    expect(runDoctor(loadProject(root), registry).ok).toBe(true);
  });

  it('yookassa: integrations.payments and provider registration', () => {
    const root = join(tmp(), 'shop');
    initProject({
      root, name: 'shop', backend: 'payload', tier: 'simple-store',
      features: ['checkout-yookassa'], registry,
    });
    expect(read(root, 'site.config.ts')).toContain('payments: "yookassa"');
    expect(read(root, 'lib/payments.ts')).toContain('registerCheckoutYookassaProvider');
    // doctor is happy with a consistent project
    expect(runDoctor(loadProject(root), registry).ok).toBe(true);
  });
});

describe('design apply', () => {
  function scaffold(features: string[] = ['catalog']): string {
    const root = join(tmp(), 'shop');
    initProject({ root, name: 'shop', backend: 'payload', tier: 'catalog', features, registry });
    return root;
  }

  it('findClaudeBin: explicit path — existing one is returned, a missing one throws', () => {
    expect(findClaudeBin(process.execPath)).toBe(process.execPath);
    expect(() => findClaudeBin(join(tmp(), 'nope', 'claude'))).toThrow(/not found/);
  });

  it('designHasInput: only README → false; added a file → true', () => {
    const root = scaffold();
    expect(designHasInput(root)).toBe(false); // base has only design/README.md
    writeFileSync(join(root, 'design', 'tokens.json'), '{}');
    expect(designHasInput(root)).toBe(true);
  });

  it('extractDesignInstruction extracts the §11 block, without neighboring sections', () => {
    const md = read(scaffold(), 'CLAUDE.md');
    const instr = extractDesignInstruction(md);
    expect(instr).toContain('INSTRUCTION: apply the design');
    expect(instr).not.toContain('## Installed features'); // section before the design block
    expect(instr).not.toContain('## vitrine CLI commands'); // section before
    expect(instr).not.toContain('## Boundaries'); // section after: the slice stops at the next ##
  });

  it('buildDesignPrompt includes the instruction, the target file and the token set', () => {
    const project = loadProject(scaffold());
    const prompt = buildDesignPrompt(project);
    expect(prompt).toContain('theme/client.css');
    expect(prompt).toContain('--vt-color-primary');
    expect(prompt).toContain('INSTRUCTION');
  });

  it('designApply shells out to Claude Code with -p and the project cwd (via a stub runner)', () => {
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

  it('designApply throws on an empty design/ (nothing to apply)', () => {
    const project = loadProject(scaffold());
    expect(() => designApply(project, { bin: process.execPath }, () => 0)).toThrow(/is empty/);
  });
});

describe('doctor', () => {
  // Synthetic registry with a feature declaring files+env+npm+slots — to control for drift.
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
        corePackages: { '@vitrine-kit/core': '>=0.1.0' }, npm: ['zod@^3'],
        files: [{ from: 'files/lib/demo/', to: 'lib/demo/' }],
        config: { set: { 'features.demo': true } },
        slots: [{ slot: 'home.hero', component: 'DemoHero', order: 10 }],
        env: [{ key: 'DEMO_KEY', required: true }],
        removable: true,
      }),
    );
    return dir;
  }

  it('clean project — no issues', () => {
    const reg = createRegistrySource(featureRegistry());
    const root = join(tmp(), 'shop');
    initProject({ root, name: 'shop', backend: 'payload', tier: 'catalog', features: ['demo'], registry: reg });
    const report = runDoctor(loadProject(root), reg);
    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('catches drift: a deleted file, a missing env, a missing dependency, a wrong version', () => {
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
    expect(report.ok).toBe(false); // there is an error-level issue
    expect(msgs).toMatch(/missing file "lib\/demo\/register\.ts"/);
    expect(msgs).toMatch(/DEMO_KEY/);
    expect(msgs).toMatch(/zod/);
    expect(msgs).toMatch(/repo version 9\.9\.9/);
  });
});

describe('kit cache', () => {
  const repoRoot = join(here, '..', '..', '..'); // monorepo: registry/ + templates/

  it('populateCache fills ~/.vitrine (registry + templates) and writes meta', () => {
    const home = tmp();
    const res = populateCache(repoRoot, { home });
    expect(existsSync(join(home, 'registry', '_index.json'))).toBe(true);
    expect(existsSync(join(home, 'templates', 'base', 'files', 'app', '(frontend)', 'layout.tsx'))).toBe(true);
    expect(readKitMeta(home)?.kitVersion).toBeDefined();
    expect(res.changelog.length).toBeGreaterThan(0);
    expect(res.changelog.every((e) => e.kind === 'added')).toBe(true); // first run
  });

  it('repeated populateCache — no changes to the feature set', () => {
    const home = tmp();
    populateCache(repoRoot, { home });
    expect(populateCache(repoRoot, { home }).changelog).toEqual([]);
  });

  it('kitStatus reads the cache', () => {
    const home = tmp();
    expect(kitStatus(home).cached).toBe(false);
    populateCache(repoRoot, { home });
    const s = kitStatus(home);
    expect(s.cached).toBe(true);
    expect(s.featureCount).toBeGreaterThanOrEqual(3);
  });

  it('offline init from the cache (DoD): VITRINE_HOME → registry and templates from ~/.vitrine', () => {
    const home = tmp();
    populateCache(repoRoot, { home });
    const prev = process.env.VITRINE_HOME;
    process.env.VITRINE_HOME = home;
    try {
      const reg = createRegistrySource(); // without explicit → should use the cache
      expect(reg.root).toBe(join(home, 'registry'));
      const root = join(tmp(), 'shop');
      initProject({ root, name: 'shop', backend: 'payload', tier: 'catalog', features: ['catalog'], registry: reg });
      expect(existsSync(join(root, 'components/catalog/ProductCard.tsx'))).toBe(true);
      expect(existsSync(join(root, 'payload.config.ts'))).toBe(true); // templates also from the cache
    } finally {
      if (prev === undefined) delete process.env.VITRINE_HOME;
      else process.env.VITRINE_HOME = prev;
    }
  });

  it('falls back to bundled kit when cache and monorepo registry are unavailable', () => {
    const bundledRegistry = join(here, '..', 'kit', 'registry', '_index.json');
    if (!existsSync(bundledRegistry)) return; // requires `pnpm build` in packages/cli

    const home = tmp(); // empty — no ~/.vitrine cache
    const isolated = tmp();
    const prevHome = process.env.VITRINE_HOME;
    const prevCwd = process.cwd();
    process.env.VITRINE_HOME = home;
    try {
      process.chdir(isolated);
      const reg = createRegistrySource();
      expect(reg.hasFeature('catalog')).toBe(true);
      const root = join(tmp(), 'shop');
      initProject({ root, name: 'shop', backend: 'payload', tier: 'catalog', features: ['catalog'], registry: reg });
      expect(existsSync(join(root, 'components/catalog/ProductCard.tsx'))).toBe(true);
    } finally {
      process.chdir(prevCwd);
      if (prevHome === undefined) delete process.env.VITRINE_HOME;
      else process.env.VITRINE_HOME = prevHome;
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

describe('init vendure / portability', () => {
  it('full-store → vendure: backend-vendure + the same storefront and features, without Payload', () => {
    const root = join(tmp(), 'shop');
    initProject({
      root,
      name: 'shop',
      backend: 'vendure',
      tier: 'full-store',
      features: ['catalog', 'product-page', 'seo', 'cart'],
      registry,
    });

    // vendure-specific
    expect(existsSync(join(root, 'vendure-config.ts'))).toBe(true);
    expect(existsSync(join(root, 'src/index.ts'))).toBe(true);
    expect(existsSync(join(root, 'lib/adapter/vendure-catalog.ts'))).toBe(true);
    expect(existsSync(join(root, 'lib/adapter/map.ts'))).toBe(true);
    // NOT Payload
    expect(existsSync(join(root, 'payload.config.ts'))).toBe(false);

    // portability: the same storefront (base) and catalog/cart components as on Payload
    expect(existsSync(join(root, 'app/(frontend)/page.tsx'))).toBe(true);
    expect(existsSync(join(root, 'components/catalog/ProductGrid.tsx'))).toBe(true);
    expect(existsSync(join(root, 'components/cart/CartView.tsx'))).toBe(true);

    const pkg = JSON.parse(read(root, 'package.json'));
    expect(pkg.dependencies['@vendure/core']).toBeDefined();
    expect(pkg.dependencies.payload).toBeUndefined();
    expect(pkg.scripts.vendure).toBe('tsx src/index.ts');
  });

  it('suggestFeatures: vendure full-store without checkout-stripe, payload simple-store — with it', () => {
    const v = suggestFeatures('full-store', registry, 'vendure');
    expect(v).toContain('cart');
    expect(v).not.toContain('checkout-stripe');
    expect(suggestFeatures('simple-store', registry, 'payload')).toContain('checkout-stripe');
  });
});

describe('merge3 (3-way)', () => {
  it('theirs-only change → take theirs', () => {
    const r = merge3('a\nb\nc', 'a\nb\nc', 'a\nb\nc\nd');
    expect(r.clean).toBe(true);
    expect(r.text).toBe('a\nb\nc\nd');
  });

  it('ours-only change → keep ours (client edit)', () => {
    const r = merge3('a\nb', 'a\nZ', 'a\nb');
    expect(r.clean).toBe(true);
    expect(r.text).toBe('a\nZ');
  });

  it('both changed the same way → clean', () => {
    const r = merge3('a\nb', 'a\nQ', 'a\nQ');
    expect(r.clean).toBe(true);
    expect(r.text).toBe('a\nQ');
  });

  it('non-overlapping changes → both applied', () => {
    const r = merge3('a\nb\nc\nd\ne', 'A\nb\nc\nd\ne', 'a\nb\nc\nd\nE');
    expect(r.clean).toBe(true);
    expect(r.text).toBe('A\nb\nc\nd\nE');
  });

  it('insertions at different ends → both applied', () => {
    const r = merge3('l1\nl2\nl3', 'HEAD\nl1\nl2\nl3', 'l1\nl2\nl3\nTAIL');
    expect(r.clean).toBe(true);
    expect(r.text).toBe('HEAD\nl1\nl2\nl3\nTAIL');
  });

  it('overlapping different changes → conflict with markers', () => {
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

describe('vitrine update', () => {
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

  it('3-way merge keeps client edits and merges in the new from the registry', () => {
    const root = setup('line1\nline2\nline3\n');
    writeFileSync(join(root, 'lib/demo/x.ts'), 'CLIENT1\nline2\nline3\n'); // client styled line1
    const v2 = createRegistrySource(demoReg('0.1.0', 'line1\nline2\nTHEIRS3\n')); // registry changed line3
    const project = loadProject(root);

    const plan = planUpdate(project, 'demo', v2);
    expect(plan.toVersion).toBe('0.1.0');
    expect(plan.hasConflicts).toBe(false);
    applyUpdate(project, plan, v2);

    const merged = read(root, 'lib/demo/x.ts');
    expect(merged).toContain('CLIENT1'); // client edit preserved
    expect(merged).toContain('THEIRS3'); // new from the registry merged in
    expect(merged).not.toContain('line1');
    expect(JSON.parse(read(root, 'vitrine.json')).features.demo.version).toBe('0.1.0');
    expect(existsSync(join(root, '.vitrine/originals/demo@0.1.0/lib/demo/x.ts'))).toBe(true);
    expect(existsSync(join(root, '.vitrine/originals/demo@0.0.0'))).toBe(false); // old pristine removed
  });

  it('conflict is marked with git markers', () => {
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

  it('diff (planUpdate) does not write files', () => {
    const root = setup('a\nb\n');
    writeFileSync(join(root, 'lib/demo/x.ts'), 'a\nZZ\n');
    const v2 = createRegistrySource(demoReg('0.1.0', 'a\nb\nc\n'));
    const before = read(root, 'lib/demo/x.ts');
    const plan = planUpdate(loadProject(root), 'demo', v2);
    expect(plan.changed).toBe(true);
    expect(read(root, 'lib/demo/x.ts')).toBe(before);
  });
});

describe('generators (pure)', () => {
  const fakeManifest = (over: Record<string, unknown> = {}) =>
    ({
      name: 'x', title: 'X', kitVersion: '0.0.0', requiresContracts: '>=1.0.0',
      tier: ['catalog'], registryDependencies: [], corePackages: {}, npm: [],
      files: [], slots: [], env: [], conflicts: [], removable: true, ...over,
    }) as unknown as FeatureState['manifest'];

  it('renderFeaturesRegion collects flags from config.set', () => {
    const states: FeatureState[] = [
      { name: 'catalog', version: '0.0.0', manifest: fakeManifest({ config: { set: { 'features.catalog': true } } }) },
    ];
    expect(renderFeaturesRegion(states)).toContain('"catalog": true');
  });

  it('renderSlotsFile calls register<Name>Slots only for features with slots', () => {
    const withSlots: FeatureState = {
      name: 'catalog', version: '0.0.0',
      manifest: fakeManifest({ slots: [{ slot: 'global.header-nav', component: 'CategoryNav' }] }),
    };
    const noSlots: FeatureState = { name: 'seo', version: '0.0.0', manifest: fakeManifest() };
    const out = renderSlotsFile([withSlots, noSlots]);
    expect(out).toContain('slotRegistry.clear()');
    expect(out).toContain('registerCatalogSlots');
    expect(out).not.toContain('registerSeoSlots');
  });

  it('renderPaymentsFile calls register<Name>Provider only for payment features', () => {
    const provider: FeatureState = {
      name: 'checkout-stripe', version: '0.0.0',
      manifest: fakeManifest({ payment: { provider: 'stripe' } }),
    };
    const noPayment: FeatureState = { name: 'cart', version: '0.0.0', manifest: fakeManifest() };
    const out = renderPaymentsFile([provider, noPayment]);
    expect(out).toContain('payments.clear()');
    expect(out).toContain('registerCheckoutStripeProvider');
    expect(out).toContain('./checkout-stripe/register.js');
    expect(out).not.toContain('registerCartProvider');
  });

  it('activePaymentProvider/renderIntegrationsRegion take the provider from the payment block', () => {
    const states: FeatureState[] = [
      { name: 'cart', version: '0.0.0', manifest: fakeManifest() },
      { name: 'checkout-yookassa', version: '0.0.0', manifest: fakeManifest({ payment: { provider: 'yookassa' } }) },
    ];
    expect(activePaymentProvider(states)).toBe('yookassa');
    expect(renderIntegrationsRegion(states)).toContain('payments: "yookassa"');
    // without payment features — an empty object
    expect(renderIntegrationsRegion([{ name: 'cart', version: '0.0.0', manifest: fakeManifest() }])).toBe(
      '  integrations: {},',
    );
  });

  it('renderBlueprintFile wires up extend<Name>Blueprint for features with a blueprint', () => {
    const f: FeatureState = {
      name: 'reviews', version: '0.0.0',
      manifest: fakeManifest({ blueprint: { extend: 'product', addFields: ['reviewsEnabled'] } }),
    };
    expect(renderBlueprintFile([f])).toContain('extendReviewsBlueprint');
  });

  it('mergePackageDeps adds corePackages and npm', () => {
    const f: FeatureState = {
      name: 'reviews', version: '0.0.0',
      manifest: fakeManifest({ corePackages: { '@vitrine-kit/core': '>=0.1.0' }, npm: ['zod@^3'] }),
    };
    const pkg = mergePackageDeps({ dependencies: {} }, [f]);
    expect((pkg.dependencies as Record<string, string>)['@vitrine-kit/core']).toBe('>=0.1.0');
    expect((pkg.dependencies as Record<string, string>).zod).toBe('^3');
  });

  it('replaceBetween replaces only the content between the markers', () => {
    const src = 'a\n// s\nOLD\n// e\nb';
    expect(replaceBetween(src, '// s', '// e', 'NEW')).toBe('a\n// s\nNEW\n// e\nb');
  });

  it('preflightNode: below the minimum throws, on the current runtime — does not', () => {
    expect(() => preflightNode(99)).toThrow(/Node >= 99 required/);
    expect(() => preflightNode(1)).not.toThrow();
  });
});

describe('kit version constants', () => {
  function caretRange(version: string): string {
    const [major, minor] = version.split('.');
    if (major === '0') return `^0.${minor}.0`;
    return `^${major}.0.0`;
  }

  it('generated ranges match published @vitrine-kit/* package versions', () => {
    const readPkg = (name: string) =>
      JSON.parse(readFileSync(join(here, '..', '..', name, 'package.json'), 'utf8')) as { version: string };
    expect(KIT_VERSION).toBe(readPkg('cli').version);
    expect(CORE_RANGE).toBe(caretRange(readPkg('core').version));
    expect(BLUEPRINT_RANGE).toBe(caretRange(readPkg('payload-blueprint').version));
  });
});
