// Vendure demo catalog (§18 equivalent): dev ONLY and when the DB is empty
// (idempotent). Full population — Vendure populate(app, initialData,
// productsCsv) or admin import; here — a guard + an integration point. The superadmin
// is created by Vendure from configuration (vendure-config.ts, env).
import type { INestApplicationContext } from '@nestjs/common';
import { Logger, ProductService, RequestContextService } from '@vendure/core';

export async function populateDemo(app: INestApplicationContext): Promise<void> {
  if (process.env.NODE_ENV === 'production') return; // never in prod

  const ctx = await app.get(RequestContextService).create({ apiType: 'admin' });
  const { totalItems } = await app.get(ProductService).findAll(ctx, { take: 1 });
  if (totalItems > 0) return; // idempotent: a non-empty DB — leave it alone

  Logger.info(
    '[vitrine] Vendure: empty DB in dev — populate the demo catalog via ' +
      'populate(app, ./seed/initial-data, ./seed/products.csv) or admin import.',
    'Vitrine',
  );
  // This is where Vendure populate() wires up with local initial-data + products.csv
  // (offline, assets in static/). Left as an integration point (requires a running Vendure).
}
