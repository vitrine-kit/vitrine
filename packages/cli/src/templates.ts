// Копирование статических файлов шаблона клиента. templates/<name>/files мирроит
// корень репозитория клиента (как registry/<feature>/files). Динамические и
// управляемые файлы (site.config.ts, vitrine.json, CLAUDE.md, package.json,
// lib/slots.ts, lib/blueprint.ts, theme/client.css) генерирует CLI отдельно —
// шаблон их НЕ содержит, чтобы примитив установки оставался источником истины.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { readText, walkRelFiles, writeText } from './util.js';

/** templates лежит рядом с registry (сиблинги в монорепо и в кэше ~/.vitrine). */
export function templatesRoot(registryRoot: string): string {
  return join(dirname(registryRoot), 'templates');
}

export function hasTemplate(root: string, name: string): boolean {
  return existsSync(join(root, name, 'files'));
}

/** Копирует все файлы templates/<name>/files в destRoot. Возвращает относительные пути. */
export function copyTemplate(root: string, name: string, destRoot: string): string[] {
  const filesDir = join(root, name, 'files');
  const rels = walkRelFiles(filesDir);
  for (const rel of rels) writeText(join(destRoot, rel), readText(join(filesDir, rel)));
  return rels;
}
