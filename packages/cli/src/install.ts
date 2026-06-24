// The feature install primitive (spec §8–§9) — the heart of the CLI, shared by init and add.
// 7 declarative steps: resolve dependencies → copy files → flag in
// site.config → slots → blueprint → env+npm → vitrine.json + CLAUDE.md.
// Idempotent (re-running the same version = no-op), transactional (rollback on error),
// snapshots pristine originals into .vitrine/originals (the base for 3-way merge, M9).
import { join } from 'node:path';
import type { FeatureManifest } from '@vitrine-kit/contracts';
import type { Project } from './project.js';
import { projectPaths } from './project.js';
import type { RegistrySource } from './registry.js';
import { FsTransaction } from './transaction.js';
import {
  type FeatureState,
  mergeEnvExample,
  mergePackageDeps,
  renderBlueprintFile,
  renderClaudeFeaturesTable,
  renderFeaturesRegion,
  renderIntegrationsRegion,
  renderPaymentsFile,
  renderSlotsFile,
} from './generate.js';
import { exists, isDir, readJson, readText, replaceBetween, safeJoin, walkRelFiles } from './util.js';
import { eachFeatureFile } from './feature-files.js';

export interface InstallResult {
  installed: string[];
  skipped: string[];
}

/** Topological order: registryDependencies before their dependents. */
function resolveOrder(names: string[], registry: RegistrySource): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  const visit = (name: string): void => {
    if (seen.has(name)) return;
    if (!registry.hasFeature(name)) {
      throw new Error(`[vitrine] feature "${name}" not found in the registry`);
    }
    seen.add(name);
    const manifest = registry.loadManifest(name);
    for (const dep of manifest.registryDependencies ?? []) visit(dep);
    order.push(name);
  };
  for (const name of names) visit(name);
  return order;
}

function validate(name: string, manifest: FeatureManifest, project: Project): void {
  if (!manifest.tier.includes(project.lock.tier)) {
    throw new Error(
      `[vitrine] feature "${name}" does not support tier "${project.lock.tier}" (only ${manifest.tier.join(', ')})`,
    );
  }
  for (const conflict of manifest.conflicts ?? []) {
    if (project.lock.features[conflict]) {
      throw new Error(`[vitrine] conflict: "${name}" is incompatible with the installed "${conflict}"`);
    }
  }
}

function copyFeatureFiles(
  project: Project,
  name: string,
  manifest: FeatureManifest,
  registry: RegistrySource,
  tx: FsTransaction,
): void {
  const featDir = registry.featureDir(name);
  const originalsBase = join(projectPaths(project.root).originals, `${name}@${manifest.kitVersion}`);

  for (const map of manifest.files) {
    if (!exists(join(featDir, map.from))) {
      throw new Error(`[vitrine] feature "${name}": no source "${map.from}"`);
    }
    for (const file of eachFeatureFile(featDir, map)) {
      const content = readText(file.srcAbs);
      tx.write(safeJoin(project.root, file.repoRel), content); // into the repo
      tx.write(safeJoin(originalsBase, file.repoRel), content); // pristine for M9
    }
  }
}

/** Regenerate derived files from the FULL state of installed features. */
export function regenerateDerived(project: Project, registry: RegistrySource, tx: FsTransaction): void {
  const paths = projectPaths(project.root);
  const states: FeatureState[] = Object.entries(project.lock.features).map(([name, pin]) => ({
    name,
    version: pin.version,
    manifest: registry.loadManifest(name),
  }));

  // 3 · features flag + active payment provider in site.config (managed regions)
  const config = readText(paths.config);
  const withFeatures = replaceBetween(
    config,
    '// vitrine:features:start',
    '// vitrine:features:end',
    renderFeaturesRegion(states),
  );
  tx.write(
    paths.config,
    replaceBetween(
      withFeatures,
      '// vitrine:integrations:start',
      '// vitrine:integrations:end',
      renderIntegrationsRegion(states),
    ),
  );

  // 4 · slots + payment providers (generated files)
  tx.write(paths.slots, renderSlotsFile(states));
  tx.write(paths.payments, renderPaymentsFile(states));

  // 5 · blueprint (generated file)
  tx.write(paths.blueprint, renderBlueprintFile(states));

  // 6 · env + npm deps
  tx.write(paths.env, mergeEnvExample(exists(paths.env) ? readText(paths.env) : '', states));
  const pkg = readJson<Record<string, unknown>>(paths.pkg);
  tx.write(paths.pkg, `${JSON.stringify(mergePackageDeps(pkg, states), null, 2)}\n`);

  // 7 · CLAUDE.md (feature table) + vitrine.json
  const claude = readText(paths.claude);
  tx.write(
    paths.claude,
    replaceBetween(
      claude,
      '<!-- vitrine:features:start -->',
      '<!-- vitrine:features:end -->',
      renderClaudeFeaturesTable(states),
    ),
  );
  tx.write(paths.lock, `${JSON.stringify(project.lock, null, 2)}\n`);
}

export function installFeatures(
  project: Project,
  names: string[],
  registry: RegistrySource,
): InstallResult {
  const order = resolveOrder(names, registry);
  const installedNames = new Set(Object.keys(project.lock.features));

  const toInstall = order.filter((name) => {
    const manifest = registry.loadManifest(name);
    const pinned = project.lock.features[name];
    return !pinned || pinned.version !== manifest.kitVersion;
  });

  // Idempotency: nothing new → an honest no-op.
  if (toInstall.length === 0) {
    return { installed: [], skipped: order };
  }

  const tx = new FsTransaction();
  try {
    for (const name of toInstall) {
      const manifest = registry.loadManifest(name);
      validate(name, manifest, project);
      copyFeatureFiles(project, name, manifest, registry, tx);
      project.lock.features[name] = { version: manifest.kitVersion };
    }
    regenerateDerived(project, registry, tx);
    tx.commit();
  } catch (error) {
    tx.rollback();
    // roll back the in-memory lock state
    for (const name of toInstall) {
      if (!installedNames.has(name)) delete project.lock.features[name];
    }
    throw error;
  }

  return {
    installed: toInstall,
    skipped: order.filter((n) => !toInstall.includes(n)),
  };
}

export function removeFeature(project: Project, name: string, registry: RegistrySource): void {
  const removed = project.lock.features[name];
  if (!removed) throw new Error(`[vitrine] feature "${name}" is not installed`);
  const manifest = registry.loadManifest(name);
  if (!manifest.removable) {
    throw new Error(`[vitrine] feature "${name}" is not removable (removable: false)`);
  }
  for (const other of Object.keys(project.lock.features)) {
    if (other === name) continue;
    const deps = registry.loadManifest(other).registryDependencies ?? [];
    if (deps.includes(name)) {
      throw new Error(`[vitrine] cannot remove "${name}": "${other}" depends on it`);
    }
  }

  // Everything mutating — in one transaction (like installFeatures): tx.remove snapshots
  // the content, so rollback restores deleted files; the lock file is regenerated from
  // the new state, and the in-memory lock is fixed by hand on error. No half-deletes.
  //
  // We delete EXACTLY the feature's files, not the whole destination directory: features
  // mapping into a shared root (cart/checkout-stripe → app/) would otherwise wipe the base
  // template and neighboring features. Source of truth — the pristine snapshot (what was
  // actually installed) ∪ the current registry source. tx.remove ignores nonexistent paths.
  const originalsDir = join(projectPaths(project.root).originals, `${name}@${removed.version}`);
  const featDir = registry.featureDir(name);
  const targets = new Set<string>();
  if (isDir(originalsDir)) for (const rel of walkRelFiles(originalsDir)) targets.add(rel);
  for (const map of manifest.files) for (const file of eachFeatureFile(featDir, map)) targets.add(file.toRel);

  const tx = new FsTransaction();
  try {
    for (const rel of targets) {
      tx.remove(safeJoin(project.root, rel)); // file in the repo
      tx.remove(safeJoin(originalsDir, rel)); // pristine snapshot
    }
    delete project.lock.features[name];
    regenerateDerived(project, registry, tx);
    tx.commit();
  } catch (error) {
    tx.rollback();
    project.lock.features[name] = removed; // restore the in-memory lock
    throw error;
  }
}
