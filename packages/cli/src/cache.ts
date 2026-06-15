// Локальный кэш kit (~/.vitrine): реестр + шаблоны + метаданные версии. Источник
// для init/add (офлайн после kit update). VITRINE_HOME переопределяет корень
// (для тестов и нестандартных установок).
import { cpSync, existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { exists, readJson, writeText } from './util.js';

export interface KitMeta {
  kitVersion: string;
  channel: string;
  updatedAt: string;
}

export interface CachePaths {
  root: string;
  registry: string;
  templates: string;
  meta: string;
}

interface RegistryIndex {
  kitVersion?: string;
  features?: Record<string, { kitVersion?: string }>;
}

export function vitrineHome(): string {
  if (process.env.VITRINE_HOME) return resolve(process.env.VITRINE_HOME);
  const home = process.env.USERPROFILE ?? process.env.HOME;
  if (!home) throw new Error('[vitrine] не удалось определить домашний каталог (HOME/USERPROFILE)');
  return join(home, '.vitrine');
}

export function cachePaths(home: string = vitrineHome()): CachePaths {
  return {
    root: home,
    registry: join(home, 'registry'),
    templates: join(home, 'templates'),
    meta: join(home, 'kit.json'),
  };
}

export function readKitMeta(home: string = vitrineHome()): KitMeta | null {
  const file = cachePaths(home).meta;
  return exists(file) ? readJson<KitMeta>(file) : null;
}

export function writeKitMeta(home: string, meta: KitMeta): void {
  writeText(cachePaths(home).meta, `${JSON.stringify(meta, null, 2)}\n`);
}

function readIndex(registryRoot: string): RegistryIndex | null {
  const file = join(registryRoot, '_index.json');
  return exists(file) ? readJson<RegistryIndex>(file) : null;
}

export interface ChangelogEntry {
  kind: 'added' | 'removed' | 'changed';
  name: string;
  from?: string;
  to?: string;
}

/** Дифф наборов фич между старым и новым _index.json (для вывода kit update). */
export function computeChangelog(
  oldIndex: RegistryIndex | null,
  newIndex: RegistryIndex | null,
): ChangelogEntry[] {
  const oldF = oldIndex?.features ?? {};
  const newF = newIndex?.features ?? {};
  const entries: ChangelogEntry[] = [];

  for (const name of Object.keys(newF).sort()) {
    if (!(name in oldF)) {
      entries.push({ kind: 'added', name, to: newF[name]?.kitVersion });
    } else if (oldF[name]?.kitVersion !== newF[name]?.kitVersion) {
      entries.push({ kind: 'changed', name, from: oldF[name]?.kitVersion, to: newF[name]?.kitVersion });
    }
  }
  for (const name of Object.keys(oldF).sort()) {
    if (!(name in newF)) entries.push({ kind: 'removed', name, from: oldF[name]?.kitVersion });
  }
  return entries;
}

export function formatChangelog(entries: ChangelogEntry[]): string {
  if (entries.length === 0) return 'без изменений набора фич';
  return entries
    .map((e) => {
      if (e.kind === 'added') return `+ ${e.name}${e.to ? ` ${e.to}` : ''}`;
      if (e.kind === 'removed') return `- ${e.name}`;
      return `~ ${e.name} ${e.from ?? '?'}→${e.to ?? '?'}`;
    })
    .join('\n');
}

export interface PopulateResult {
  kitVersion: string;
  changelog: ChangelogEntry[];
}

/**
 * Заполняет кэш из дерева-источника (клон kit или распакованный release-tarball):
 * копирует <from>/registry и <from>/templates в ~/.vitrine, пишет kit.json,
 * возвращает changelog (старый кэш ↔ новый). Идемпотентно перезаписывает.
 */
export function populateCache(
  fromDir: string,
  opts: { home?: string; channel?: string } = {},
): PopulateResult {
  const home = opts.home ?? vitrineHome();
  const srcRegistry = join(fromDir, 'registry');
  const srcTemplates = join(fromDir, 'templates');
  if (!existsSync(join(srcRegistry, '_index.json'))) {
    throw new Error(`[vitrine] в "${fromDir}" нет registry/_index.json — это не дерево kit`);
  }

  const paths = cachePaths(home);
  const oldIndex = readIndex(paths.registry);

  rmSync(paths.registry, { recursive: true, force: true });
  cpSync(srcRegistry, paths.registry, { recursive: true });
  if (existsSync(srcTemplates)) {
    rmSync(paths.templates, { recursive: true, force: true });
    cpSync(srcTemplates, paths.templates, { recursive: true });
  }

  const newIndex = readIndex(paths.registry);
  const kitVersion = newIndex?.kitVersion ?? '0.0.0';
  writeKitMeta(home, {
    kitVersion,
    channel: opts.channel ?? 'stable',
    updatedAt: new Date().toISOString(),
  });

  return { kitVersion, changelog: computeChangelog(oldIndex, newIndex) };
}
