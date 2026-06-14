// Клиентский проект: корень (где лежит vitrine.json), пути управляемых файлов,
// загрузка/доступ к лок-файлу.
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { vitrineLockSchema, type VitrineLock } from '@maks417/contracts';
import { readText } from './util.js';

export interface Project {
  root: string;
  lock: VitrineLock;
}

export interface ProjectPaths {
  config: string;
  slots: string;
  blueprint: string;
  claude: string;
  env: string;
  pkg: string;
  lock: string;
  originals: string;
}

export function projectPaths(root: string): ProjectPaths {
  return {
    config: join(root, 'site.config.ts'),
    slots: join(root, 'lib', 'slots.ts'),
    blueprint: join(root, 'lib', 'blueprint.ts'),
    claude: join(root, 'CLAUDE.md'),
    env: join(root, '.env.example'),
    pkg: join(root, 'package.json'),
    lock: join(root, 'vitrine.json'),
    originals: join(root, '.vitrine', 'originals'),
  };
}

export function findProjectRoot(start: string = process.cwd()): string | null {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, 'vitrine.json'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function loadProject(root: string): Project {
  const lock = vitrineLockSchema.parse(JSON.parse(readText(join(root, 'vitrine.json'))));
  return { root, lock };
}
