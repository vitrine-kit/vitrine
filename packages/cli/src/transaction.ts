// A filesystem transaction: writes via write(), remembering each file's prior
// state; rollback() reverts everything (restores content or deletes created files).
// Makes the install primitive partially transactional (plan §8).
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

interface Backup {
  path: string;
  existed: boolean;
  prev?: string;
}

export class FsTransaction {
  private backups: Backup[] = [];

  private snapshot(path: string): void {
    if (this.backups.some((b) => b.path === path)) return;
    if (existsSync(path)) this.backups.push({ path, existed: true, prev: readFileSync(path, 'utf8') });
    else this.backups.push({ path, existed: false });
  }

  write(path: string, content: string): void {
    this.snapshot(path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, 'utf8');
  }

  remove(path: string): void {
    this.snapshot(path);
    if (existsSync(path)) rmSync(path);
  }

  rollback(): void {
    for (const b of [...this.backups].reverse()) {
      if (b.existed) writeFileSync(b.path, b.prev as string, 'utf8');
      else if (existsSync(b.path)) rmSync(b.path);
    }
    this.backups = [];
  }

  commit(): void {
    this.backups = [];
  }
}
