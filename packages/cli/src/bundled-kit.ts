// Bundled registry/templates shipped with the npm package (packages/cli/kit/).
// Lets `vitrine init` work after a global install without `kit update` first.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Root of the bundled kit tree (contains registry/ and templates/), or null if not shipped. */
export function bundledKitRoot(): string | null {
  const distDir = dirname(fileURLToPath(import.meta.url));
  const candidate = join(distDir, '..', 'kit');
  if (existsSync(join(candidate, 'registry', '_index.json'))) return candidate;
  return null;
}
