// Источник реестра фич. В проде — кэш ~/.vitrine/registry (M7); в dev — реестр
// монорепо (поиск вверх по дереву). Можно переопределить флагом/env.
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { featureManifestSchema, type FeatureManifest } from '@vitrine-kit/contracts';
import { vitrineHome } from './cache.js';
import { isDir, readText } from './util.js';

export interface RegistrySource {
  root: string;
  featureDir(name: string): string;
  hasFeature(name: string): boolean;
  loadManifest(name: string): FeatureManifest;
  listFeatures(): string[];
}

function findUpRegistry(start: string): string | null {
  let dir = resolve(start);
  for (;;) {
    const candidate = join(dir, 'registry');
    if (existsSync(join(candidate, '_index.json'))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function resolveRegistryRoot(explicit?: string): string {
  if (explicit) return resolve(explicit);
  if (process.env.VITRINE_REGISTRY) return resolve(process.env.VITRINE_REGISTRY);
  // Кэш kit (~/.vitrine/registry), заполняемый `kit update`. Корень ~/.vitrine —
  // единый источник (cache.vitrineHome): VITRINE_HOME, иначе USERPROFILE/HOME.
  let home: string | null;
  try {
    home = vitrineHome();
  } catch {
    home = null; // нет HOME/USERPROFILE — переходим к dev-реестру
  }
  if (home) {
    const cache = join(home, 'registry');
    if (existsSync(join(cache, '_index.json'))) return cache;
  }
  const dev = findUpRegistry(process.cwd());
  if (dev) return dev;
  throw new Error('[vitrine] реестр не найден. Запусти "vitrine kit update" или укажи --registry.');
}

export function createRegistrySource(explicitRoot?: string): RegistrySource {
  const root = resolveRegistryRoot(explicitRoot);
  const cache = new Map<string, FeatureManifest>();

  const featureDir = (name: string): string => join(root, name);

  const hasFeature = (name: string): boolean => existsSync(join(featureDir(name), 'feature.json'));

  const loadManifest = (name: string): FeatureManifest => {
    const cached = cache.get(name);
    if (cached) return cached;
    const file = join(featureDir(name), 'feature.json');
    if (!existsSync(file)) throw new Error(`[vitrine] фича "${name}" не найдена в реестре`);
    const manifest = featureManifestSchema.parse(JSON.parse(readText(file)));
    cache.set(name, manifest);
    return manifest;
  };

  const listFeatures = (): string[] => {
    const index = JSON.parse(readText(join(root, '_index.json'))) as { features?: Record<string, unknown> };
    return Object.keys(index.features ?? {});
  };

  return { root, featureDir, hasFeature, loadManifest, listFeatures };
}

export { isDir };
