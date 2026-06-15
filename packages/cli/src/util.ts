import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

/**
 * Preflight (шаг 0 визарда, план §10): требуем Node >= min, иначе понятная ошибка
 * вместо загадочного падения дальше по стеку. Ошибка ловится верхним .catch в
 * index.ts (печать message + exit 1).
 */
export function preflightNode(min = 20): void {
  const major = Number(process.versions.node.split('.')[0]);
  if (Number.isFinite(major) && major < min) {
    throw new Error(
      `[vitrine] нужен Node >= ${min} (текущий ${process.versions.node}). ` +
        `Установите Node ${min} LTS: https://nodejs.org`,
    );
  }
}

export function exists(p: string): boolean {
  return existsSync(p);
}

export function isDir(p: string): boolean {
  return existsSync(p) && statSync(p).isDirectory();
}

export function readText(p: string): string {
  return readFileSync(p, 'utf8');
}

export function readJson<T = unknown>(p: string): T {
  return JSON.parse(readText(p)) as T;
}

export function writeText(p: string, content: string): void {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content, 'utf8');
}

export function ensureDir(p: string): void {
  mkdirSync(p, { recursive: true });
}

/** Файлы внутри dir рекурсивно, пути относительно dir (с разделителем '/'). */
export function walkRelFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const abs = join(current, entry.name);
      if (entry.isDirectory()) walk(abs);
      else out.push(relative(dir, abs).split('\\').join('/'));
    }
  };
  walk(dir);
  return out;
}

/** product-page → ProductPage, catalog → Catalog. */
export function pascalCase(s: string): string {
  return s.replace(/(^|[-_/])(\w)/g, (_m, _sep, ch: string) => ch.toUpperCase());
}

export function sortKeys<T>(obj: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const k of Object.keys(obj).sort()) out[k] = obj[k] as T;
  return out;
}

/** "zod@^3" → { name: "zod", range: "^3" }; "@scope/x@^1" → { "@scope/x", "^1" }. */
export function parseNpmSpec(spec: string): { name: string; range: string } {
  const at = spec.lastIndexOf('@');
  if (at > 0) return { name: spec.slice(0, at), range: spec.slice(at + 1) };
  return { name: spec, range: 'latest' };
}

/**
 * Заменяет содержимое между маркерами (маркерные строки сохраняются).
 * Работает и для TS (`// vitrine:x:start`), и для Markdown (`<!-- vitrine:x:start -->`).
 */
export function replaceBetween(
  content: string,
  startMarker: string,
  endMarker: string,
  replacement: string,
): string {
  const si = content.indexOf(startMarker);
  const ei = content.indexOf(endMarker);
  if (si === -1 || ei === -1 || ei < si) {
    throw new Error(`[vitrine] маркеры "${startMarker}"/"${endMarker}" не найдены`);
  }
  const afterStartLine = content.indexOf('\n', si) + 1;
  const endLineStart = content.lastIndexOf('\n', ei) + 1;
  return content.slice(0, afterStartLine) + replacement + '\n' + content.slice(endLineStart);
}
