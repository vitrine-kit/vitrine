// kit update / kit status / self-update (§7, §9). kit update populates the
// ~/.vitrine cache from the public npm package @vitrine-kit/vitrine (bundled
// registry + templates under kit/) OR from a local tree (--from <dir>).
// After update, init/add work offline from the cache.
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { KIT_VERSION } from './kit.js';
import { cachePaths, populateCache, readKitMeta, vitrineHome, type PopulateResult } from './cache.js';
import { exists, readJson } from './util.js';

const NPM_PKG = '@vitrine-kit/vitrine';

/** Prefer `node …/npm-cli.js` so Windows does not need a shell for .cmd shims. */
function resolveNpmCli(): string | null {
  const candidates = [
    join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    join(dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

function hasNpm(): boolean {
  if (resolveNpmCli()) return true;
  const probe = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(probe, ['npm'], { stdio: 'ignore', shell: process.platform === 'win32' }).status === 0;
}

function runNpm(
  args: string[],
  opts: { encoding?: 'utf8'; stdio?: 'inherit' | ['ignore', 'pipe', 'pipe'] } = {},
): SpawnSyncReturns<string | Buffer> {
  const cli = resolveNpmCli();
  if (cli) {
    return spawnSync(process.execPath, [cli, ...args], {
      encoding: opts.encoding,
      stdio: opts.stdio ?? 'inherit',
    });
  }
  return spawnSync('npm', args, {
    encoding: opts.encoding,
    stdio: opts.stdio ?? 'inherit',
    shell: process.platform === 'win32',
  });
}

/** Resolve an npm package spec for kit update (public registry, no auth). */
export function resolveKitNpmSpec(version?: string): string {
  if (!version || version === 'latest') return `${NPM_PKG}@latest`;
  if (version.startsWith(`${NPM_PKG}@`)) return version;
  if (version.startsWith('@') && version.includes('/')) return version;
  const semver = version.replace(/^v/, '');
  return `${NPM_PKG}@${semver}`;
}

/**
 * Network path: `npm install @vitrine-kit/vitrine --prefix <tmp>` →
 * `node_modules/@vitrine-kit/vitrine/kit` (registry + templates on npmjs.com).
 */
function acquireFromNpm(tmp: string, version?: string): string {
  if (!hasNpm()) {
    throw new Error('[vitrine] network update needs npm, or pass --from <dir>');
  }
  const spec = resolveKitNpmSpec(version);
  if (!/^[@A-Za-z0-9_./-]+$/.test(spec)) {
    throw new Error(`[vitrine] invalid kit version/spec: ${version}`);
  }

  const install = runNpm(
    [
      'install',
      spec,
      '--prefix',
      tmp,
      '--no-save',
      '--ignore-scripts',
      '--no-package-lock',
      '--registry',
      'https://registry.npmjs.org/',
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (install.status !== 0) {
    const err = (install.stderr || install.stdout || install.error?.message || '').toString().trim();
    throw new Error(
      `[vitrine] npm install ${spec} failed${err ? `: ${err}` : ''} — check https://www.npmjs.com/package/@vitrine-kit/vitrine`,
    );
  }

  const kitRoot = join(tmp, 'node_modules', '@vitrine-kit', 'vitrine', 'kit');
  if (existsSync(join(kitRoot, 'registry', '_index.json'))) return kitRoot;

  throw new Error(
    '[vitrine] installed package has no kit/registry/_index.json — reinstall @vitrine-kit/vitrine or pass --from <dir>',
  );
}

export interface KitUpdateOptions {
  from?: string;
  version?: string;
  channel?: string;
  home?: string;
}

/**
 * Warn-only version cross-check against the installed CLI package.json.
 */
function warnOnVersionMismatch(root: string, requested?: string): void {
  if (!requested) return;
  const tagSemver =
    requested.match(/^@vitrine-kit\/vitrine@(.+)$/)?.[1] ?? requested.match(/^v?(\d+\.\d+\.\d+\S*)$/)?.[1];
  if (!tagSemver || tagSemver === 'latest') return;

  const pkgCandidates = [
    join(root, '..', 'package.json'), // …/vitrine/kit → …/vitrine/package.json
    join(root, 'packages', 'cli', 'package.json'),
    join(root, 'package.json'),
  ];
  const pkgFile = pkgCandidates.find((p) => exists(p));
  if (!pkgFile) return;
  const version = readJson<{ version?: string }>(pkgFile).version;
  if (version && version !== tagSemver) {
    console.warn(`[vitrine] requested "${requested}" but the downloaded kit is @vitrine-kit/vitrine@${version}`);
  }
}

export function kitUpdate(opts: KitUpdateOptions = {}): PopulateResult {
  if (opts.from) {
    return populateCache(resolve(opts.from), { home: opts.home, channel: opts.channel ?? 'stable' });
  }
  const tmp = mkdtempSync(join(tmpdir(), 'vitrine-kit-'));
  try {
    const source = acquireFromNpm(tmp, opts.version);
    warnOnVersionMismatch(source, opts.version);
    return populateCache(source, { home: opts.home, channel: opts.channel ?? 'stable' });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
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
  const res = runNpm(args, { stdio: 'inherit' });
  if (res.error) throw res.error;
  return res.status ?? 0;
}
