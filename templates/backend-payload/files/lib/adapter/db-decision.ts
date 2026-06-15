// Чистая логика выбора адаптера БД (§18.1 спеки). Без зависимостей и сайд-эффектов
// — поэтому покрыта unit-тестами как единственный источник истины таблицы решений.
// Обёртка с реальными адаптерами Payload — в db.ts.

export interface DbDecisionInput {
  /** Значение DATABASE_URL (null/'' = не задан). */
  url: string | null;
  /** Удалось ли подключиться к Postgres (ping). */
  canConnect: boolean;
  isProd: boolean;
  /** VITRINE_DB_STRICT=1 — запрещает fallback даже в dev. */
  strict: boolean;
}

export type DbDecision =
  | { kind: 'postgres' }
  | { kind: 'sqlite'; warn?: string }
  | { kind: 'error'; message: string };

/**
 * Таблица §18.1:
 *  url + connect           → postgres
 *  url, !connect, prod|strict → error (никогда не падать молча на проде)
 *  url, !connect, dev      → sqlite + warn
 *  !url, prod              → error
 *  !url, dev               → sqlite
 */
export function decideDbAdapter(input: DbDecisionInput): DbDecision {
  const { url, canConnect, isProd, strict } = input;

  if (url) {
    if (canConnect) return { kind: 'postgres' };
    if (isProd || strict) {
      return { kind: 'error', message: '[vitrine] DATABASE_URL задан, но БД недоступна' };
    }
    return { kind: 'sqlite', warn: '[vitrine] Postgres недоступен → fallback на SQLite (dev)' };
  }

  if (isProd) {
    return { kind: 'error', message: '[vitrine] DATABASE_URL обязателен в production' };
  }
  return { kind: 'sqlite' };
}
