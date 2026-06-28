// Copies registry/ + templates/ from the monorepo into packages/cli/kit for npm publish.
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, '..');
const monorepoRoot = join(pkgRoot, '..', '..');
const dest = join(pkgRoot, 'kit');

for (const name of ['registry', 'templates']) {
  const src = join(monorepoRoot, name);
  if (!existsSync(src)) {
    console.error(`[copy-kit] missing ${src}`);
    process.exit(1);
  }
}

const kitVersion = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8')).version;

function patchRegistryVersions(registryDir) {
  const indexPath = join(registryDir, '_index.json');
  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  index.kitVersion = kitVersion;
  for (const meta of Object.values(index.features ?? {})) {
    if (meta && typeof meta === 'object') meta.kitVersion = kitVersion;
  }
  writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

  for (const entry of readdirSync(registryDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const featPath = join(registryDir, entry.name, 'feature.json');
    if (!existsSync(featPath)) continue;
    const feat = JSON.parse(readFileSync(featPath, 'utf8'));
    feat.kitVersion = kitVersion;
    writeFileSync(featPath, `${JSON.stringify(feat, null, 2)}\n`);
  }
}

rmSync(dest, { recursive: true, force: true });
cpSync(join(monorepoRoot, 'registry'), join(dest, 'registry'), { recursive: true });
cpSync(join(monorepoRoot, 'templates'), join(dest, 'templates'), { recursive: true });
patchRegistryVersions(join(dest, 'registry'));
console.log(`[copy-kit] bundled registry + templates → packages/cli/kit (kitVersion ${kitVersion})`);
