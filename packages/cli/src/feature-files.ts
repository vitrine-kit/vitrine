// A single pass over the files a feature maps into the repository (manifest.files[*]).
// The "isDir(src) ? walkRelFiles(src) : ['']" block + repoRel/toRel assembly used to be
// duplicated across install/update/doctor; here it's one source of truth (eliminates
// the divergences that caused the deletion bug, see removeFeature).
import { join } from 'node:path';
import { exists, isDir, toPosix, walkRelFiles } from './util.js';

export interface FeatureFileMap {
  from: string;
  to: string;
}

export interface FeatureFile {
  /** Absolute source path in the registry. */
  srcAbs: string;
  /** Destination path relative to the repo root (with OS separators). */
  repoRel: string;
  /** The same destination in POSIX form (for the lock file, output, comparisons). */
  toRel: string;
}

/**
 * Enumerates each concrete file of a feature's mapping. If the source is missing,
 * yields nothing (the caller decides whether that's an error or a skip).
 */
export function* eachFeatureFile(featDir: string, map: FeatureFileMap): Generator<FeatureFile> {
  const src = join(featDir, map.from);
  if (!exists(src)) return;
  const rels = isDir(src) ? walkRelFiles(src) : [''];
  for (const rel of rels) {
    const srcAbs = rel ? join(src, rel) : src;
    const repoRel = rel ? join(map.to, rel) : map.to;
    yield { srcAbs, repoRel, toRel: toPosix(repoRel) };
  }
}
