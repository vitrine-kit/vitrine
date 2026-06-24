// kit update / kit status / self-update (§7, §9). kit update populates the
// ~/.vitrine cache from a GitHub release tarball (network, via gh) OR from a local tree
// (--from <dir>: a kit clone or an unpacked tarball; the offline path). After update,
// init/add work offline from the cache.
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

/** Network path: gh release download (source tarball) → tar -xzf → the kit tree root. */
function acquireFromGh(version?: string): string {
  if (!hasBin('gh')) {
    throw new Error('[vitrine] network update needs gh (GitHub CLI), or pass --from <dir>');
  }
  if (!hasBin('tar')) {
    throw new Error('[vitrine] unpacking needs tar, or pass --from <dir>');
  }
  const tmp = mkdtempSync(join(tmpdir(), 'vitrine-kit-'));
  const dl = spawnSync(
    'gh',
    ['release', 'download', ...(version ? [version] : []), '--repo', REPO, '--archive=tar.gz', '--dir', tmp, '--clobber'],
    { stdio: 'inherit' },
  );
  if (dl.status !== 0) {
    throw new Error('[vitrine] gh release download failed (check access/auth: gh auth status, and gh auth login if needed)');
  }
  const tarball = readdirSync(tmp).find((f) => f.endsWith('.tar.gz'));
  if (!tarball) throw new Error('[vitrine] release tarball not found after download');
  if (spawnSync('tar', ['-xzf', join(tmp, tarball), '-C', tmp], { stdio: 'inherit' }).status !== 0) {
    throw new Error('[vitrine] tarball extraction failed');
  }
  const root = readdirSync(tmp)
    .map((f) => join(tmp, f))
    .find((p) => statSync(p).isDirectory() && existsSync(join(p, 'registry', '_index.json')));
  if (!root) throw new Error('[vitrine] the unpacked tarball has no registry/_index.json');
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
