#!/usr/bin/env node
/**
 * Smoke: scaffold a fresh Payload client and `docker compose up --build`.
 * Requires Docker Desktop (daemon) + a prior `pnpm build` of the CLI.
 *
 * Usage: node scripts/smoke-docker-client.mjs [targetDir]
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(root, 'packages', 'cli', 'dist', 'index.js');
const target = resolve(process.argv[2] ?? mkdtempSync(join(tmpdir(), 'vitrine-docker-')));

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

if (!existsSync(cli)) {
  console.error('[smoke-docker] build the CLI first: pnpm --filter @vitrine-kit/vitrine build');
  process.exit(1);
}

const docker = spawnSync('docker', ['info'], { encoding: 'utf8', shell: process.platform === 'win32' });
if (docker.status !== 0) {
  console.error('[smoke-docker] Docker daemon is not available. Start Docker Desktop and retry.');
  process.exit(1);
}

console.log(`[smoke-docker] scaffolding → ${target}`);
if (existsSync(join(target, 'vitrine.json'))) {
  console.log('[smoke-docker] target already scaffolded — skipping init');
} else {
  run(process.execPath, [
    cli,
    'init',
    '--yes',
    '--tier',
    'simple-store',
    '--name',
    'docker-smoke',
    '--project',
    target,
  ]);
}

writeFileSync(
  join(target, '.env'),
  ['PAYLOAD_SECRET=smoke-secret-change-me', 'SEED_ON_BOOT=1', 'EMAIL_FROM=noreply@localhost', ''].join('\n'),
);

console.log('[smoke-docker] docker compose up --build (Ctrl+C to stop)');
run('docker', ['compose', 'up', '--build'], { cwd: target });
