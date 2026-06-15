// vitrine update / diff (§7, §9). Единственная «цена» copy-in модели: апдейт
// фичи в реестре не прилетает в репо сам. update делает 3-way merge:
// base = pristine-оригинал версии (.vitrine/originals), ours = репо клиента
// (стилизованный), theirs = версия из реестра. Стиль клиента сохраняется, новое
// вливается, неразрешимое — помечается git-маркерами. diff = тот же план в dry-run.
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import type { Project } from './project.js';
import { projectPaths } from './project.js';
import type { RegistrySource } from './registry.js';
import { FsTransaction } from './transaction.js';
import { regenerateDerived } from './install.js';
import { merge3 } from './merge.js';
import { exists, isDir, readText, walkRelFiles } from './util.js';

export type FileStatus = 'unchanged' | 'clean' | 'conflict' | 'new';

export interface FileUpdate {
  to: string;
  status: FileStatus;
  merged: string;
  conflicts: number;
}

export interface UpdatePlan {
  feature: string;
  fromVersion: string;
  toVersion: string;
  files: FileUpdate[];
  hasConflicts: boolean;
  changed: boolean;
}

export function planUpdate(project: Project, name: string, registry: RegistrySource): UpdatePlan {
  const pin = project.lock.features[name];
  if (!pin) throw new Error(`[vitrine] фича "${name}" не установлена`);
  if (!registry.hasFeature(name)) throw new Error(`[vitrine] фича "${name}" не найдена в реестре`);

  const manifest = registry.loadManifest(name);
  const fromVersion = pin.version;
  const toVersion = manifest.kitVersion;
  const featDir = registry.featureDir(name);
  const originalsBase = join(projectPaths(project.root).originals, `${name}@${fromVersion}`);

  const files: FileUpdate[] = [];
  for (const map of manifest.files) {
    const src = join(featDir, map.from);
    if (!exists(src)) continue;
    const rels = isDir(src) ? walkRelFiles(src) : [''];
    for (const rel of rels) {
      const theirs = rel ? readText(join(src, rel)) : readText(src);
      const repoRel = rel ? join(map.to, rel) : map.to;
      const toRel = repoRel.split('\\').join('/');
      const ours = exists(join(project.root, repoRel)) ? readText(join(project.root, repoRel)) : null;
      const base = exists(join(originalsBase, repoRel)) ? readText(join(originalsBase, repoRel)) : null;

      if (ours === null) {
        files.push({ to: toRel, status: 'new', merged: theirs, conflicts: 0 });
      } else if (theirs === base || theirs === ours) {
        files.push({ to: toRel, status: 'unchanged', merged: ours, conflicts: 0 });
      } else if (base === null) {
        // нет pristine-базы (фича стара) — безопасный 2-way: расхождение = конфликт
        files.push({ to: toRel, status: 'conflict', merged: ours, conflicts: 1 });
      } else {
        const res = merge3(base, ours, theirs);
        files.push({ to: toRel, status: res.clean ? 'clean' : 'conflict', merged: res.text, conflicts: res.conflicts });
      }
    }
  }

  return {
    feature: name,
    fromVersion,
    toVersion,
    files,
    hasConflicts: files.some((f) => f.status === 'conflict'),
    changed: toVersion !== fromVersion || files.some((f) => f.status !== 'unchanged'),
  };
}

export function applyUpdate(project: Project, plan: UpdatePlan, registry: RegistrySource): void {
  const manifest = registry.loadManifest(plan.feature);
  const featDir = registry.featureDir(plan.feature);
  const paths = projectPaths(project.root);
  const newOriginals = join(paths.originals, `${plan.feature}@${plan.toVersion}`);
  const oldOriginals = join(paths.originals, `${plan.feature}@${plan.fromVersion}`);

  const tx = new FsTransaction();
  try {
    for (const f of plan.files) {
      if (f.status !== 'unchanged') tx.write(join(project.root, f.to), f.merged);
    }
    // новый pristine-снапшот = текущая версия реестра (theirs) целиком — база следующего update
    for (const map of manifest.files) {
      const src = join(featDir, map.from);
      if (!exists(src)) continue;
      const rels = isDir(src) ? walkRelFiles(src) : [''];
      for (const rel of rels) {
        const theirs = rel ? readText(join(src, rel)) : readText(src);
        const repoRel = rel ? join(map.to, rel) : map.to;
        tx.write(join(newOriginals, repoRel), theirs);
      }
    }
    project.lock.features[plan.feature] = { version: plan.toVersion };
    regenerateDerived(project, registry, tx);
    tx.commit();
  } catch (error) {
    tx.rollback();
    throw error;
  }

  if (plan.fromVersion !== plan.toVersion) {
    rmSync(oldOriginals, { recursive: true, force: true });
  }
}

/** Текстовый план для diff/вывода update. */
export function renderPlan(plan: UpdatePlan): string {
  const head =
    plan.fromVersion === plan.toVersion
      ? `${plan.feature} @ ${plan.toVersion}`
      : `${plan.feature} ${plan.fromVersion} → ${plan.toVersion}`;
  const lines = plan.files
    .filter((f) => f.status !== 'unchanged')
    .map((f) => {
      const mark = f.status === 'conflict' ? '✗ конфликт' : f.status === 'new' ? '+ новый  ' : '~ слияние';
      return `  ${mark} ${f.to}${f.conflicts ? ` (конфликтов: ${f.conflicts})` : ''}`;
    });
  return lines.length === 0 ? `${head}: изменений нет` : [head, ...lines].join('\n');
}
