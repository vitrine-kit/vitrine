// Copies the client's static template files. templates/<name>/files mirrors
// the client repository root (like registry/<feature>/files). Dynamic and
// managed files (site.config.ts, vitrine.json, CLAUDE.md, package.json,
// lib/slots.ts, lib/blueprint.ts, theme/client.css) are generated separately by the CLI —
// the template does NOT contain them, so the install primitive stays the source of truth.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { readText, walkRelFiles, writeText } from './util.js';

/** templates sits next to registry (siblings in the monorepo and in the ~/.vitrine cache). */
export function templatesRoot(registryRoot: string): string {
  return join(dirname(registryRoot), 'templates');
}

export function hasTemplate(root: string, name: string): boolean {
  return existsSync(join(root, name, 'files'));
}

/** Copies all files from templates/<name>/files into destRoot. Returns relative paths. */
export function copyTemplate(root: string, name: string, destRoot: string): string[] {
  const filesDir = join(root, name, 'files');
  const rels = walkRelFiles(filesDir);
  for (const rel of rels) writeText(join(destRoot, rel), readText(join(filesDir, rel)));
  return rels;
}
