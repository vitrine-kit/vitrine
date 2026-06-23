// kit update / kit status / self-update (§7, §9). kit update заполняет кэш
// ~/.vitrine из release-tarball GitHub (network, через gh) ИЛИ из локального дерева
// (--from <dir>: клон kit или распакованный tarball; офлайн-путь). После update
// init/add работают офлайн из кэша.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { KIT_VERSION } from './kit.js';
import { cachePaths, populateCache, readKitMeta, vitrineHome, type PopulateResult } from './cache.js';
import { exists, readJson } from './util.js';

const REPO = 'vitrine-kit/vitrine';

function hasBin(bin: string): boolean {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(probe, [bin], { stdio: 'ignore' }).status === 0;
}

/** Сетевой путь: gh release download (source tarball) → tar -xzf → корень дерева kit. */
function acquireFromGh(version?: string): string {
  if (!hasBin('gh')) {
    throw new Error('[vitrine] для сетевого обновления нужен gh (GitHub CLI), либо укажите --from <dir>');
  }
  if (!hasBin('tar')) {
    throw new Error('[vitrine] для распаковки нужен tar, либо укажите --from <dir>');
  }
  const tmp = mkdtempSync(join(tmpdir(), 'vitrine-kit-'));
  const dl = spawnSync(
    'gh',
    ['release', 'download', ...(version ? [version] : []), '--repo', REPO, '--archive=tar.gz', '--dir', tmp, '--clobber'],
    { stdio: 'inherit' },
  );
  if (dl.status !== 0) {
    throw new Error('[vitrine] gh release download не удался (проверьте доступ/авторизацию: gh auth status, при необходимости gh auth login)');
  }
  const tarball = readdirSync(tmp).find((f) => f.endsWith('.tar.gz'));
  if (!tarball) throw new Error('[vitrine] release-tarball не найден после загрузки');
  if (spawnSync('tar', ['-xzf', join(tmp, tarball), '-C', tmp], { stdio: 'inherit' }).status !== 0) {
    throw new Error('[vitrine] распаковка tarball не удалась');
  }
  const root = readdirSync(tmp)
    .map((f) => join(tmp, f))
    .find((p) => statSync(p).isDirectory() && existsSync(join(p, 'registry', '_index.json')));
  if (!root) throw new Error('[vitrine] в распакованном tarball нет registry/_index.json');
  return root;
}

export interface KitUpdateOptions {
  from?: string;
  version?: string;
  channel?: string;
  home?: string;
}

export function kitUpdate(opts: KitUpdateOptions = {}): PopulateResult {
  const source = opts.from ? resolve(opts.from) : acquireFromGh(opts.version);
  return populateCache(source, { home: opts.home, channel: opts.channel ?? 'stable' });
}

export interface KitStatusReport {
  cached: boolean;
  kitVersion?: string;
  channel?: string;
  updatedAt?: string;
  featureCount?: number;
  cliKitVersion: string;
}

export function kitStatus(home: string = vitrineHome()): KitStatusReport {
  const meta = readKitMeta(home);
  const idxFile = join(cachePaths(home).registry, '_index.json');
  const idx = exists(idxFile) ? readJson<{ features?: Record<string, unknown> }>(idxFile) : null;
  return {
    cached: meta !== null,
    kitVersion: meta?.kitVersion,
    channel: meta?.channel,
    updatedAt: meta?.updatedAt,
    featureCount: idx ? Object.keys(idx.features ?? {}).length : undefined,
    cliKitVersion: KIT_VERSION,
  };
}

export function selfUpdate(opts: { dryRun?: boolean } = {}): number {
  const args = ['install', '-g', '@vitrine-kit/vitrine@latest'];
  if (opts.dryRun) {
    console.log(`[vitrine] npm ${args.join(' ')}`);
    return 0;
  }
  const res = spawnSync('npm', args, { stdio: 'inherit' });
  if (res.error) throw res.error;
  return res.status ?? 0;
}
