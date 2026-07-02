// The feature registry source. In prod — the ~/.vitrine/registry cache; in dev — the
// monorepo registry (search up the tree). Can be overridden by flag/env.
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { featureManifestSchema, type FeatureManifest } from '@vitrine-kit/contracts';
import { bundledKitRoot } from './bundled-kit.js';
import { vitrineHome } from './cache.js';
import { assertFeatureName, assertSafeRel, isDir, readText } from './util.js';

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
  // The kit cache (~/.vitrine/registry), populated by `kit update`. The ~/.vitrine root is
  // the single source (cache.vitrineHome): VITRINE_HOME, otherwise USERPROFILE/HOME.
  let home: string | null;
  try {
    home = vitrineHome();
  } catch {
    home = null; // no HOME/USERPROFILE — fall through to the dev registry
  }
  if (home) {
    const cache = join(home, 'registry');
    if (existsSync(join(cache, '_index.json'))) return cache;
  }
  const dev = findUpRegistry(process.cwd());
  if (dev) return dev;
  const bundled = bundledKitRoot();
  if (bundled) return join(bundled, 'registry');
  throw new Error('[vitrine] registry not found. Run "vitrine kit update" or pass --registry.');
}

export function createRegistrySource(explicitRoot?: string): RegistrySource {
  const root = resolveRegistryRoot(explicitRoot);
  const cache = new Map<string, FeatureManifest>();

  // The single choke point for name → directory (install/update/remove/doctor all
  // flow through it) — reject names that could escape the registry root.
  const featureDir = (name: string): string => {
    assertFeatureName(name);
    return join(root, name);
  };

  const hasFeature = (name: string): boolean => existsSync(join(featureDir(name), 'feature.json'));

  const loadManifest = (name: string): FeatureManifest => {
    const cached = cache.get(name);
    if (cached) return cached;
    const file = join(featureDir(name), 'feature.json');
    if (!existsSync(file)) throw new Error(`[vitrine] feature "${name}" not found in the registry`);
    const manifest = featureManifestSchema.parse(JSON.parse(readText(file)));
    // A broken/malicious manifest must not read outside the feature dir or write
    // outside the repo (the dest side is additionally guarded by safeJoin at write time).
    for (const map of manifest.files) {
      assertSafeRel(map.from, `feature "${name}": files.from`);
      assertSafeRel(map.to, `feature "${name}": files.to`);
    }
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
