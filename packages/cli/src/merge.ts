// Line-based 3-way merge (diff3) for `vitrine update`. Base = the pristine original
// of the version (.vitrine/originals), ours = the client repo (styled), theirs =
// the version from the registry. Pure, dependency-free — hence covered by tests as
// the only non-trivial M9 logic. A clean merge is silent; a conflict — git markers.

function splitLines(s: string): string[] {
  return s.split('\n');
}

/** LCS index matches (i in a, j in b), in ascending order. */
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
  baseEnd: number; // replace base[baseStart, baseEnd) with lines
  lines: string[];
}

/** Changes base → other as hunks over base indices. */
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

/** Ceiling on LCS matrix cells (O(n·m) memory). Feature files are tiny; a guard against pathology. */
const MAX_LCS_CELLS = 4_000_000;

export function merge3(base: string, ours: string, theirs: string, labels: MergeLabels = {}): MergeResult {
  const B = splitLines(base);
  const O = splitLines(ours);
  const T = splitLines(theirs);
  const ourLabel = labels.ours ?? 'ours (client repo)';
  const theirLabel = labels.theirs ?? 'theirs (registry)';

  // Safe fallback without building a huge DP matrix on giant inputs.
  if (B.length * Math.max(O.length, T.length) > MAX_LCS_CELLS) {
    if (ours === theirs || theirs === base) return { text: ours, clean: true, conflicts: 0 };
    if (ours === base) return { text: theirs, clean: true, conflicts: 0 };
    const text = [`<<<<<<< ${ourLabel}`, ours, '=======', theirs, `>>>>>>> ${theirLabel}`].join('\n');
    return { text, clean: false, conflicts: 1 };
  }

  const oh = changeHunks(B, O);
  const th = changeHunks(B, T);

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

    // Group overlapping hunks from both sides into the region [p, end).
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
