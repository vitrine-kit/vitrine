// Чистые генераторы управляемых/производных файлов из состояния установленных
// фич. Регенерация из состояния (а не патчинг) делает шаги примитива
// идемпотентными по построению.
import { TOKEN_CSS_VARS, type FeatureManifest } from '@maks417/contracts';
import { parseEnvKeys, pascalCase, parseNpmSpec, sortKeys } from './util.js';

export interface FeatureState {
  name: string;
  version: string;
  manifest: FeatureManifest;
}

/** Флаги features из config.set всех фич (ключи вида "features.<x>"). */
export function collectFeatureFlags(features: FeatureState[]): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  for (const f of features) {
    for (const [key, value] of Object.entries(f.manifest.config?.set ?? {})) {
      if (key.startsWith('features.')) flags[key.slice('features.'.length)] = value;
    }
  }
  return flags;
}

/** Тело свойства `features` для управляемого региона site.config (2 пробела). */
export function renderFeaturesRegion(features: FeatureState[]): string {
  const flags = collectFeatureFlags(features);
  const keys = Object.keys(flags).sort();
  if (keys.length === 0) return '  features: {},';
  const body = keys.map((k) => `    ${JSON.stringify(k)}: ${flags[k]},`).join('\n');
  return `  features: {\n${body}\n  },`;
}

/** Имена фич не должны схлопываться в один PascalCase-идентификатор (дубль register/extend). */
function assertNoPascalCollisions(features: FeatureState[]): void {
  const byPascal = new Map<string, string>();
  for (const f of features) {
    const id = pascalCase(f.name);
    const prev = byPascal.get(id);
    if (prev && prev !== f.name) {
      throw new Error(`[vitrine] фичи "${prev}" и "${f.name}" дают один идентификатор "${id}" — переименуйте одну`);
    }
    byPascal.set(id, f.name);
  }
}

/** lib/slots.ts — целиком генерируемый: зовёт register<Name>Slots() фич со слотами. */
export function renderSlotsFile(features: FeatureState[]): string {
  const withSlots = features.filter((f) => (f.manifest.slots?.length ?? 0) > 0);
  assertNoPascalCollisions(withSlots);
  const imports = withSlots.map(
    (f) => `import { register${pascalCase(f.name)}Slots } from './${f.name}/register.js';`,
  );
  const calls = withSlots.map((f) => `  register${pascalCase(f.name)}Slots();`);
  return [
    '// vitrine:generated — регистрация слотов установленных фич. Не редактировать вручную.',
    ...imports,
    '',
    'export function registerSlots(): void {',
    ...(calls.length ? calls : ['  // нет фич со слотами']),
    '}',
    '',
  ].join('\n');
}

/** lib/blueprint.ts — базовый blueprint + аддитивные расширения фич с blueprint. */
export function renderBlueprintFile(features: FeatureState[]): string {
  const withBp = features.filter((f) => f.manifest.blueprint);
  assertNoPascalCollisions(withBp);
  const imports = withBp.map(
    (f) => `import { extend${pascalCase(f.name)}Blueprint } from './${f.name}/blueprint.js';`,
  );
  const calls = withBp.map((f) => `  extend${pascalCase(f.name)}Blueprint(blueprint);`);
  return [
    '// vitrine:generated — blueprint установленных фич. Не редактировать вручную.',
    "import { createBlueprint } from '@maks417/payload-blueprint';",
    ...imports,
    '',
    'const blueprint = createBlueprint();',
    ...calls,
    '',
    'export const collections = blueprint.build();',
    '',
  ].join('\n');
}

/** Управляемая таблица фич для CLAUDE.md. */
export function renderClaudeFeaturesTable(features: FeatureState[]): string {
  if (features.length === 0) return '_Фичи ещё не установлены._';
  const rows = features
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((f) => `| \`${f.name}\` | ${f.manifest.title} | ${f.version} |`)
    .join('\n');
  return ['| Фича | Описание | Версия |', '|---|---|---|', rows].join('\n');
}

/** Идемпотентное добавление недостающих ключей env в .env.example. */
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

/** Слияние corePackages + npm фич в dependencies package.json (идемпотентно). */
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

/** Нейтральная тема: имена всех токенов контракта со стартовыми значениями. */
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
    '/* vitrine: значения токенов клиента. Дизайн-шаг (vitrine design apply) переписывает только это. */',
    ':root {',
    lines,
    '}',
    '',
  ].join('\n');
}
