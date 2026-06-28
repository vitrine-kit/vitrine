// Typecheck registry Next API route glue (cart/checkout/webhooks) against ambient stubs.
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const monorepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('registry API route glue', () => {
  it('typechecks against Next/Payload stubs (tsconfig.routes.json)', () => {
    expect(() =>
      execSync('pnpm exec tsc -p registry/tsconfig.routes.json --pretty false', {
        cwd: monorepoRoot,
        stdio: 'pipe',
        encoding: 'utf8',
      }),
    ).not.toThrow();
  });
});
