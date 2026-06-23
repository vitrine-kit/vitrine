// Инвариант переносимости (план §3/§8). Из @vitrine-kit/* copy-in фича реестра может
// зависеть ТОЛЬКО от пакетов, которые ставит ЛЮБОЙ клиент независимо от движка:
//   - @vitrine-kit/contracts — пять контрактов;
//   - @vitrine-kit/core      — рантайм слотов (<Slot>/registerSlot) и критлогика
//                          (корзина/заказ/Stripe-webhook).
// Запрещён в первую очередь @vitrine-kit/payload-blueprint (его НЕ ставит vendure-клиент —
// см. clientPackageJson в packages/cli/src/init.ts: blueprint только для backend=payload),
// а заодно и сам CLI / любой будущий движок-специфичный пакет. Иначе фича перестаёт
// быть переносимой между клиентскими репозиториями (ломает доказательство M10).
// Сканируем ВЕСЬ registry/*/files/** (включая app/** Next-glue, который не покрыт
// typecheck:registry). Запускается в обычном `pnpm test` → уже в CI.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const registry = resolve(here, '../../registry');

/** Все .ts/.tsx внутри dir рекурсивно (абсолютные пути). */
function walkSources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkSources(abs));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(abs);
  }
  return out;
}

/** Спецификаторы из import/export-from, side-effect import, dynamic import(), require(). */
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
// Разрешены только движко-независимые пакеты (есть у любого клиента): contracts + core.
const ALLOWED = ['@vitrine-kit/contracts', '@vitrine-kit/core'];
const isAllowed = (spec: string) =>
  ALLOWED.some((pkg) => spec === pkg || spec.startsWith(`${pkg}/`));

describe('инвариант: фичи реестра зависят только от @vitrine-kit/{contracts,core}', () => {
  const featureDirs = readdirSync(registry, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  it('реестр непустой (защита от молчаливого no-op)', () => {
    expect(featureDirs.length).toBeGreaterThan(0);
  });

  for (const feature of featureDirs) {
    it(feature, () => {
      const filesDir = join(registry, feature, 'files');
      let files: string[];
      try {
        files = walkSources(filesDir);
      } catch {
        return; // у фичи нет files/ — нечего проверять
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
        `фича "${feature}" импортирует движко-специфичный/внутренний пакет ` +
          `(разрешены только ${ALLOWED.join(', ')}):\n  ${violations.join('\n  ')}`,
      ).toEqual([]);
    });
  }
});
