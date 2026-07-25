// Smoke: Tailwind loads the client config via createRequire, so the published
// package must expose a CJS entry (`require` condition). This test guards that
// the dual build is present after `pnpm build`.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cjsEntry = join(root, 'dist', 'index.cjs');

describe('package exports (CJS for Tailwind)', () => {
  it('ships dist/index.cjs after build', () => {
    expect(existsSync(cjsEntry), 'run pnpm build before test — missing dist/index.cjs').toBe(
      true,
    );
  });

  it('require() resolves vitrinePreset', () => {
    if (!existsSync(cjsEntry)) return;
    const req = createRequire(import.meta.url);
    const mod = req('../dist/index.cjs') as { vitrinePreset?: { theme?: unknown } };
    expect(mod.vitrinePreset?.theme).toBeTruthy();
  });
});
