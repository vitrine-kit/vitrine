// Примитив установки фичи (§8–§9 спеки) — сердце CLI, общий для init и add.
// 7 шагов декларативно: резолв зависимостей → копирование files → флаг в
// site.config → слоты → blueprint → env+npm → vitrine.json + CLAUDE.md.
// Идемпотентен (повтор той же версии = no-op), транзакционен (откат при ошибке),
// снапшотит pristine-оригиналы в .vitrine/originals (база для 3-way merge, M9).
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import type { FeatureManifest } from '@maks417/contracts';
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
  renderSlotsFile,
} from './generate.js';
import { exists, isDir, readJson, readText, replaceBetween, walkRelFiles } from './util.js';

export interface InstallResult {
  installed: string[];
  skipped: string[];
}

/** Топологический порядок: registryDependencies раньше зависящих. */
function resolveOrder(names: string[], registry: RegistrySource): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  const visit = (name: string): void => {
    if (seen.has(name)) return;
    if (!registry.hasFeature(name)) {
      throw new Error(`[vitrine] фича "${name}" не найдена в реестре`);
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
      `[vitrine] фича "${name}" не поддерживает уровень "${project.lock.tier}" (только ${manifest.tier.join(', ')})`,
    );
  }
  for (const conflict of manifest.conflicts ?? []) {
    if (project.lock.features[conflict]) {
      throw new Error(`[vitrine] конфликт: "${name}" несовместима с установленной "${conflict}"`);
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
    const src = join(featDir, map.from);
    if (!exists(src)) {
      throw new Error(`[vitrine] фича "${name}": нет источника "${map.from}"`);
    }
    const rels = isDir(src) ? walkRelFiles(src) : [''];
    for (const rel of rels) {
      const content = rel ? readText(join(src, rel)) : readText(src);
      tx.write(join(project.root, map.to, rel), content); // в репо
      tx.write(join(originalsBase, map.to, rel), content); // pristine для M9
    }
  }
}

/** Перегенерация производных файлов из ПОЛНОГО состояния установленных фич. */
function regenerateDerived(project: Project, registry: RegistrySource, tx: FsTransaction): void {
  const paths = projectPaths(project.root);
  const states: FeatureState[] = Object.entries(project.lock.features).map(([name, pin]) => ({
    name,
    version: pin.version,
    manifest: registry.loadManifest(name),
  }));

  // 3 · флаг в site.config (управляемый регион)
  const config = readText(paths.config);
  tx.write(
    paths.config,
    replaceBetween(config, '// vitrine:features:start', '// vitrine:features:end', renderFeaturesRegion(states)),
  );

  // 4 · слоты (генерируемый файл)
  tx.write(paths.slots, renderSlotsFile(states));

  // 5 · blueprint (генерируемый файл)
  tx.write(paths.blueprint, renderBlueprintFile(states));

  // 6 · env + npm deps
  tx.write(paths.env, mergeEnvExample(exists(paths.env) ? readText(paths.env) : '', states));
  const pkg = readJson<Record<string, unknown>>(paths.pkg);
  tx.write(paths.pkg, `${JSON.stringify(mergePackageDeps(pkg, states), null, 2)}\n`);

  // 7 · CLAUDE.md (таблица фич) + vitrine.json
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

  // Идемпотентность: ничего нового → честный no-op.
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
    // откат состояния лок-файла в памяти
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
  if (!project.lock.features[name]) throw new Error(`[vitrine] фича "${name}" не установлена`);
  const manifest = registry.loadManifest(name);
  if (!manifest.removable) {
    throw new Error(`[vitrine] фича "${name}" не удаляема (removable: false)`);
  }
  for (const other of Object.keys(project.lock.features)) {
    if (other === name) continue;
    const deps = registry.loadManifest(other).registryDependencies ?? [];
    if (deps.includes(name)) {
      throw new Error(`[vitrine] нельзя удалить "${name}": от неё зависит "${other}"`);
    }
  }

  for (const map of manifest.files) {
    rmSync(join(project.root, map.to), { recursive: true, force: true });
  }
  rmSync(join(projectPaths(project.root).originals, `${name}@${manifest.kitVersion}`), {
    recursive: true,
    force: true,
  });
  delete project.lock.features[name];

  const tx = new FsTransaction();
  try {
    regenerateDerived(project, registry, tx);
    tx.commit();
  } catch (error) {
    tx.rollback();
    throw error;
  }
}
