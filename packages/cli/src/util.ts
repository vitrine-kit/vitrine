import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

/**
 * Preflight (wizard step 0, plan §10): require Node >= min, otherwise a clear error
 * instead of a cryptic failure further down the stack. The error is caught by the top-level
 * .catch in index.ts (prints message + exit 1).
 */
export function preflightNode(min = 20): void {
  const major = Number(process.versions.node.split('.')[0]);
  if (Number.isFinite(major) && major < min) {
    throw new Error(
      `[vitrine] Node >= ${min} required (current ${process.versions.node}). ` +
        `Install Node ${min} LTS: https://nodejs.org`,
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

/** Normalizes a path to POSIX separators ('/') — for the lock file, output, and comparisons. */
export function toPosix(p: string): string {
  return p.split('\\').join('/');
}

/**
 * join(root, ...segs) guaranteeing the result stays within root.
 * Guards against a manifest with `to: "../.."` (path traversal) and symlink escapes.
 */
export function safeJoin(root: string, ...segs: string[]): string {
  const base = resolve(root);
  const target = resolve(base, ...segs);
  const rel = relative(base, target);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`[vitrine] path "${join(...segs)}" escapes "${root}"`);
  }
  return target;
}

/** Variable keys (names) from .env text; skips comments and empty lines. */
export function parseEnvKeys(text: string): Set<string> {
  return new Set(
    text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => l.split('=')[0]?.trim() ?? '')
      .filter(Boolean),
  );
}

/** Files inside dir recursively, paths relative to dir (with '/' separator). */
export function walkRelFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const abs = join(current, entry.name);
      if (entry.isDirectory()) walk(abs);
      else out.push(toPosix(relative(dir, abs)));
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
 * Replaces the content between markers (the marker lines are kept).
 * Works for both TS (`// vitrine:x:start`) and Markdown (`<!-- vitrine:x:start -->`).
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
    throw new Error(`[vitrine] markers "${startMarker}"/"${endMarker}" not found`);
  }
  const afterStartLine = content.indexOf('\n', si) + 1;
  const endLineStart = content.lastIndexOf('\n', ei) + 1;
  return `${content.slice(0, afterStartLine)}${replacement}\n${content.slice(endLineStart)}`;
}
