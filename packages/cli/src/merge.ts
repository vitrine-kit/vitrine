// Построчный 3-way merge (diff3) для `vitrine update`. База = pristine-оригинал
// версии (.vitrine/originals), ours = репо клиента (стилизованный), theirs =
// версия из реестра. Чисто, без зависимостей — поэтому покрыто тестами как
// единственная нетривиальная логика M9. Чистый merge тихий; конфликт — git-маркеры.

function splitLines(s: string): string[] {
  return s.split('\n');
}

/** LCS-совпадения индексов (i в a, j в b), в порядке возрастания. */
function lcsMatches(a: string[], b: string[]): Array<[number, number]> {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    const row = dp[i] as number[];
    const next = dp[i + 1] as number[];
    for (let j = m - 1; j >= 0; j--) {
      row[j] = a[i] === b[j] ? (next[j + 1] as number) + 1 : Math.max(next[j] as number, row[j + 1] as number);
    }
  }
  const pairs: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if ((dp[i + 1] as number[])[j]! >= (dp[i] as number[])[j + 1]!) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
}

interface Hunk {
  baseStart: number;
  baseEnd: number; // заменить base[baseStart, baseEnd) на lines
  lines: string[];
}

/** Изменения base → other как ханки над индексами base. */
function changeHunks(base: string[], other: string[]): Hunk[] {
  const matches = lcsMatches(base, other);
  const hunks: Hunk[] = [];
  let bi = 0;
  let oi = 0;
  const flush = (bEnd: number, oEnd: number): void => {
    if (bEnd > bi || oEnd > oi) hunks.push({ baseStart: bi, baseEnd: bEnd, lines: other.slice(oi, oEnd) });
  };
  for (const [mb, mo] of matches) {
    flush(mb, mo);
    bi = mb + 1;
    oi = mo + 1;
  }
  flush(base.length, other.length);
  return hunks;
}

function applyHunks(base: string[], start: number, end: number, hunks: Hunk[]): string[] {
  const res: string[] = [];
  let i = start;
  for (const h of hunks) {
    for (; i < h.baseStart; i++) res.push(base[i] as string);
    res.push(...h.lines);
    i = h.baseEnd;
  }
  for (; i < end; i++) res.push(base[i] as string);
  return res;
}

function eq(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

export interface MergeResult {
  text: string;
  clean: boolean;
  conflicts: number;
}

export interface MergeLabels {
  ours?: string;
  theirs?: string;
}

export function merge3(base: string, ours: string, theirs: string, labels: MergeLabels = {}): MergeResult {
  const B = splitLines(base);
  const O = splitLines(ours);
  const T = splitLines(theirs);
  const oh = changeHunks(B, O);
  const th = changeHunks(B, T);
  const ourLabel = labels.ours ?? 'ours (репо клиента)';
  const theirLabel = labels.theirs ?? 'theirs (реестр)';

  const out: string[] = [];
  let conflicts = 0;
  let p = 0;
  let oi = 0;
  let ti = 0;
  const N = B.length;

  const startOf = (hunks: Hunk[], idx: number): number => (idx < hunks.length ? (hunks[idx] as Hunk).baseStart : Infinity);

  while (p < N || oi < oh.length || ti < th.length) {
    const nextChange = Math.min(startOf(oh, oi), startOf(th, ti));
    if (p < nextChange) {
      const upto = Math.min(nextChange, N);
      for (; p < upto; p++) out.push(B[p] as string);
      if (p >= N && oi >= oh.length && ti >= th.length) break;
      continue;
    }

    // Группируем перекрывающиеся ханки обеих сторон в регион [p, end).
    const groupO: Hunk[] = [];
    const groupT: Hunk[] = [];
    let end = p;
    let grew = true;
    while (grew) {
      grew = false;
      while (oi + groupO.length < oh.length) {
        const h = oh[oi + groupO.length] as Hunk;
        if (h.baseStart < end || h.baseStart === p) {
          groupO.push(h);
          end = Math.max(end, h.baseEnd);
          grew = true;
        } else break;
      }
      while (ti + groupT.length < th.length) {
        const h = th[ti + groupT.length] as Hunk;
        if (h.baseStart < end || h.baseStart === p) {
          groupT.push(h);
          end = Math.max(end, h.baseEnd);
          grew = true;
        } else break;
      }
    }

    const ourText = applyHunks(B, p, end, groupO);
    const theirText = applyHunks(B, p, end, groupT);
    oi += groupO.length;
    ti += groupT.length;

    if (eq(ourText, theirText)) {
      out.push(...ourText);
    } else if (groupT.length === 0) {
      out.push(...ourText);
    } else if (groupO.length === 0) {
      out.push(...theirText);
    } else {
      conflicts++;
      out.push(`<<<<<<< ${ourLabel}`, ...ourText, '=======', ...theirText, `>>>>>>> ${theirLabel}`);
    }
    p = end;
  }

  return { text: out.join('\n'), clean: conflicts === 0, conflicts };
}
