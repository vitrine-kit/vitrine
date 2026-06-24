// Pure DB adapter selection logic (§18.1 of the spec). No dependencies or side
// effects — so it's covered by unit tests as the single source of truth for the
// decision table. The wrapper with real Payload adapters lives in db.ts.

export interface DbDecisionInput {
  /** Value of DATABASE_URL (null/'' = not set). */
  url: string | null;
  /** Whether we managed to connect to Postgres (ping). */
  canConnect: boolean;
  isProd: boolean;
  /** VITRINE_DB_STRICT=1 — disallows fallback even in dev. */
  strict: boolean;
}

export type DbDecision =
  | { kind: 'postgres' }
  | { kind: 'sqlite'; warn?: string }
  | { kind: 'error'; message: string };

/**
 * Table §18.1:
 *  url + connect           → postgres
 *  url, !connect, prod|strict → error (never fail silently in production)
 *  url, !connect, dev      → sqlite + warn
 *  !url, prod              → error
 *  !url, dev               → sqlite
 */
export function decideDbAdapter(input: DbDecisionInput): DbDecision {
  const { url, canConnect, isProd, strict } = input;

  if (url) {
    if (canConnect) return { kind: 'postgres' };
    if (isProd || strict) {
      return { kind: 'error', message: '[vitrine] DATABASE_URL is set, but the DB is unreachable' };
    }
    return { kind: 'sqlite', warn: '[vitrine] Postgres unreachable → falling back to SQLite (dev)' };
  }

  if (isProd) {
    return { kind: 'error', message: '[vitrine] DATABASE_URL is required in production' };
  }
  return { kind: 'sqlite' };
}
