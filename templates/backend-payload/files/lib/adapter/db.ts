// DB adapter selection for Payload (§18.1). The decision lives in the pure
// decideDbAdapter; here we only wire up the real adapters and log the choice.
import { postgresAdapter } from '@payloadcms/db-postgres';
import { sqliteAdapter } from '@payloadcms/db-sqlite';
import { decideDbAdapter } from './db-decision.js';
import { canConnectPostgres } from './db-ping.js';

export async function resolveDbAdapter() {
  const url = process.env.DATABASE_URL ?? null;
  const decision = decideDbAdapter({
    url,
    isProd: process.env.NODE_ENV === 'production',
    strict: process.env.VITRINE_DB_STRICT === '1',
    canConnect: url ? await canConnectPostgres(url) : false,
  });

  if (decision.kind === 'error') throw new Error(decision.message);
  if (decision.warn) console.warn(decision.warn);

  if (decision.kind === 'postgres') {
    console.info('[vitrine] DB: Postgres');
    return postgresAdapter({ pool: { connectionString: url as string } });
  }

  console.info('[vitrine] DB: SQLite (.vitrine/dev.sqlite)');
  return sqliteAdapter({ client: { url: 'file:./.vitrine/dev.sqlite' } });
}
