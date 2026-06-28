// Portability invariant (plan §3/§8). From @vitrine-kit/*, a copy-in registry feature may
// depend ONLY on packages that EVERY client installs regardless of the engine:
//   - @vitrine-kit/contracts — the five contracts;
//   - @vitrine-kit/core      — the slot runtime (<Slot>/registerSlot) and critical logic
//                          (cart/order/payment webhook dispatch).
// Forbidden first and foremost is @vitrine-kit/payload-blueprint (a vendure client does NOT install it —
// see clientPackageJson in packages/cli/src/init.ts: blueprint is for backend=payload only),
// and likewise the CLI itself / any future engine-specific package. Otherwise a feature stops
// being portable between client repositories (breaks the portability proof).
// We scan ALL of registry/*/files/** (including the app/** Next glue, which is not covered by
// typecheck:registry). Runs in a regular `pnpm test` → already in CI.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const registry = resolve(here, '../../registry');

/** All .ts/.tsx inside dir recursively (absolute paths). */
function walkSources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkSources(abs));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(abs);
  }
  return out;
}

/** Specifiers from import/export-from, side-effect import, dynamic import(), require(). */
function importSpecifiers(source: string): string[] {
  const specs: string[] = [];
  const patterns = [
    /\bfrom\s*['"]([^'"]+)['"]/g, // import … from 'x' / export … from 'x'
    /\bimport\s*['"]([^'"]+)['"]/g, // import 'x'
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g, // import('x')
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g, // require('x')
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) specs.push(m[1] as string);
  }
  return specs;
}

const isMaks = (spec: string) => spec === '@vitrine-kit' || spec.startsWith('@vitrine-kit/');
// Only engine-independent packages are allowed (present in any client): contracts + core.
const ALLOWED = ['@vitrine-kit/contracts', '@vitrine-kit/core'];
const isAllowed = (spec: string) =>
  ALLOWED.some((pkg) => spec === pkg || spec.startsWith(`${pkg}/`));

describe('invariant: registry features depend only on @vitrine-kit/{contracts,core}', () => {
  const featureDirs = readdirSync(registry, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  it('registry is non-empty (guards against a silent no-op)', () => {
    expect(featureDirs.length).toBeGreaterThan(0);
  });

  for (const feature of featureDirs) {
    it(feature, () => {
      const filesDir = join(registry, feature, 'files');
      let files: string[];
      try {
        files = walkSources(filesDir);
      } catch {
        return; // the feature has no files/ — nothing to check
      }

      const violations: string[] = [];
      for (const file of files) {
        const src = readFileSync(file, 'utf8');
        for (const spec of importSpecifiers(src)) {
          if (isMaks(spec) && !isAllowed(spec)) {
            violations.push(`${relative(registry, file).split('\\').join('/')} → ${spec}`);
          }
        }
      }

      expect(
        violations,
        `feature "${feature}" imports an engine-specific/internal package ` +
          `(only ${ALLOWED.join(', ')} are allowed):\n  ${violations.join('\n  ')}`,
      ).toEqual([]);
    });
  }
});
