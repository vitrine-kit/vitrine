// Pure generators of managed/derived files from the state of installed
// features. Regenerating from state (rather than patching) makes the primitive's steps
// idempotent by construction.
import { TOKEN_CSS_VARS, type FeatureManifest } from '@vitrine-kit/contracts';
import { parseEnvKeys, pascalCase, parseNpmSpec, sortKeys } from './util.js';

export interface FeatureState {
  name: string;
  version: string;
  manifest: FeatureManifest;
}

/** features flags from every feature's config.set (keys like "features.<x>"). */
export function collectFeatureFlags(features: FeatureState[]): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  for (const f of features) {
    for (const [key, value] of Object.entries(f.manifest.config?.set ?? {})) {
      if (key.startsWith('features.')) flags[key.slice('features.'.length)] = value;
    }
  }
  return flags;
}

/** Body of the `features` property for the managed site.config region (2-space indent). */
export function renderFeaturesRegion(features: FeatureState[]): string {
  const flags = collectFeatureFlags(features);
  const keys = Object.keys(flags).sort();
  if (keys.length === 0) return '  features: {},';
  const body = keys.map((k) => `    ${JSON.stringify(k)}: ${flags[k]},`).join('\n');
  return `  features: {\n${body}\n  },`;
}

/** The active payment provider from installed features' payment blocks (one active). */
export function activePaymentProvider(features: FeatureState[]): string | undefined {
  const providers = new Set<string>();
  for (const f of features) {
    if (f.manifest.payment) providers.add(f.manifest.payment.provider);
  }
  return [...providers].sort()[0];
}

/** Body of the `integrations` property for the managed site.config region (2-space indent). */
export function renderIntegrationsRegion(features: FeatureState[]): string {
  const payments = activePaymentProvider(features);
  if (!payments) return '  integrations: {},';
  return `  integrations: {\n    payments: ${JSON.stringify(payments)},\n  },`;
}

/** Feature names must not collapse into one PascalCase identifier (duplicate register/extend). */
function assertNoPascalCollisions(features: FeatureState[]): void {
  const byPascal = new Map<string, string>();
  for (const f of features) {
    const id = pascalCase(f.name);
    const prev = byPascal.get(id);
    if (prev && prev !== f.name) {
      throw new Error(`[vitrine] features "${prev}" and "${f.name}" produce the same identifier "${id}" — rename one`);
    }
    byPascal.set(id, f.name);
  }
}

/** lib/slots.ts — fully generated: calls register<Name>Slots() of slot features. */
export function renderSlotsFile(features: FeatureState[]): string {
  const withSlots = features.filter((f) => (f.manifest.slots?.length ?? 0) > 0);
  assertNoPascalCollisions(withSlots);
  const imports = withSlots.map(
    (f) => `import { register${pascalCase(f.name)}Slots } from './${f.name}/register.js';`,
  );
  const calls = withSlots.map((f) => `  register${pascalCase(f.name)}Slots();`);
  return [
    '// vitrine:generated — slot registration for installed features. Do not edit by hand.',
    ...imports,
    '',
    'export function registerSlots(): void {',
    ...(calls.length ? calls : ['  // no slot features']),
    '}',
    '',
  ].join('\n');
}

/** lib/payments.ts — fully generated: calls register<Name>Provider() of payment features. */
export function renderPaymentsFile(features: FeatureState[]): string {
  const withPayment = features.filter((f) => f.manifest.payment);
  assertNoPascalCollisions(withPayment);
  const imports = withPayment.map(
    (f) => `import { register${pascalCase(f.name)}Provider } from './${f.name}/register.js';`,
  );
  const calls = withPayment.map((f) => `  register${pascalCase(f.name)}Provider();`);
  return [
    '// vitrine:generated — payment-provider registration for installed features. Do not edit by hand.',
    ...imports,
    '',
    'export function registerPayments(): void {',
    ...(calls.length ? calls : ['  // no payment features']),
    '}',
    '',
  ].join('\n');
}

/** lib/blueprint.ts — base blueprint + additive extensions of blueprint features. */
export function renderBlueprintFile(features: FeatureState[]): string {
  const withBp = features.filter((f) => f.manifest.blueprint);
  assertNoPascalCollisions(withBp);
  const imports = withBp.map(
    (f) => `import { extend${pascalCase(f.name)}Blueprint } from './${f.name}/blueprint.js';`,
  );
  const calls = withBp.map((f) => `  extend${pascalCase(f.name)}Blueprint(blueprint);`);
  return [
    '// vitrine:generated — blueprint of installed features. Do not edit by hand.',
    "import { createBlueprint } from '@vitrine-kit/payload-blueprint';",
    ...imports,
    '',
    'const blueprint = createBlueprint();',
    ...calls,
    '',
    'export const collections = blueprint.build();',
    '',
  ].join('\n');
}

/** Managed feature table for CLAUDE.md. */
export function renderClaudeFeaturesTable(features: FeatureState[]): string {
  if (features.length === 0) return '_No features installed yet._';
  const rows = features
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((f) => `| \`${f.name}\` | ${f.manifest.title} | ${f.version} |`)
    .join('\n');
  return ['| Feature | Description | Version |', '|---|---|---|', rows].join('\n');
}

/** Idempotently add missing env keys to .env.example. */
export function mergeEnvExample(existing: string, features: FeatureState[]): string {
  const present = parseEnvKeys(existing);
  const additions: string[] = [];
  for (const f of features) {
    for (const e of f.manifest.env ?? []) {
      if (!present.has(e.key)) {
        additions.push(`${e.key}=`);
        present.add(e.key);
      }
    }
  }
  if (additions.length === 0) return existing;
  return `${existing.trimEnd()}\n\n${additions.join('\n')}\n`;
}

/** Merge features' corePackages + npm into package.json dependencies (idempotent). */
export function mergePackageDeps(
  pkg: Record<string, unknown>,
  features: FeatureState[],
): Record<string, unknown> {
  const deps: Record<string, string> = { ...((pkg.dependencies as Record<string, string>) ?? {}) };
  for (const f of features) {
    for (const [name, range] of Object.entries(f.manifest.corePackages ?? {})) deps[name] = String(range);
    for (const spec of f.manifest.npm ?? []) {
      const { name, range } = parseNpmSpec(spec);
      deps[name] = range;
    }
  }
  return { ...pkg, dependencies: sortKeys(deps) };
}

/** Neutral theme: all contract token names with starter values. */
export function renderNeutralTheme(): string {
  const neutral: Record<string, string> = {
    '--vt-color-bg': '#ffffff',
    '--vt-color-fg': '#111111',
    '--vt-color-muted': '#f4f4f5',
    '--vt-color-muted-fg': '#6b7280',
    '--vt-color-surface': '#ffffff',
    '--vt-color-surface-fg': '#111111',
    '--vt-color-border': '#e5e7eb',
    '--vt-color-input': '#e5e7eb',
    '--vt-color-ring': '#111111',
    '--vt-color-primary': '#111111',
    '--vt-color-primary-fg': '#ffffff',
    '--vt-color-price': '#111111',
    '--vt-radius-base': '0.5rem',
    '--vt-space-unit': '0.25rem',
    '--vt-space-container-max': '72rem',
    '--vt-space-container-padding': '1rem',
    '--vt-space-section-gap': '2rem',
  };
  const lines = TOKEN_CSS_VARS.map((v) => `  ${v}: ${neutral[v] ?? 'initial'};`).join('\n');
  return [
    '/* vitrine: client token values. The design step (vitrine design apply) rewrites only this. */',
    ':root {',
    lines,
    '}',
    '',
  ].join('\n');
}
