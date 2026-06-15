// Единый обход файлов, которые фича отображает в репозиторий (manifest.files[*]).
// Раньше блок "isDir(src) ? walkRelFiles(src) : ['']" + сборка repoRel/toRel был
// продублирован в install/update/doctor; здесь он один — источник правды (устраняет
// расхождения, которые приводили к багу удаления, см. removeFeature).
import { join } from 'node:path';
import { exists, isDir, toPosix, walkRelFiles } from './util.js';

export interface FeatureFileMap {
  from: string;
  to: string;
}

export interface FeatureFile {
  /** Абсолютный путь источника в реестре. */
  srcAbs: string;
  /** Путь назначения относительно корня репо (с разделителями ОС). */
  repoRel: string;
  /** То же назначение в POSIX-виде (для лок-файла, вывода, сравнений). */
  toRel: string;
}

/**
 * Перечисляет каждый конкретный файл отображения фичи. Если источник отсутствует —
 * не отдаёт ничего (вызывающий сам решает, ошибка это или пропуск).
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
