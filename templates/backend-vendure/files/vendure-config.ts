// Vendure server config. DB: Postgres (DATABASE_URL) or the embedded better-sqlite3
// in dev (zero-config, §18 equivalent). Superadmin — from env (change it for prod).
// The Stripe plugin is wired in at tier=full with payments.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DefaultJobQueuePlugin, DefaultSearchPlugin, type VendureConfig } from '@vendure/core';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const IS_DEV = process.env.NODE_ENV !== 'production';

function dbConnectionOptions(): VendureConfig['dbConnectionOptions'] {
  const url = process.env.DATABASE_URL;
  if (url) {
    return { type: 'postgres', url, synchronize: IS_DEV } as VendureConfig['dbConnectionOptions'];
  }
  if (!IS_DEV) {
    // In production there's no silent fallback to SQLite (§18).
    throw new Error('[vitrine] DATABASE_URL is required in production');
  }
  // dev zero-config: embedded SQLite (no DB server).
  return {
    type: 'better-sqlite3',
    database: path.join(dirname, '.vitrine', 'vendure.sqlite'),
    synchronize: true,
  } as VendureConfig['dbConnectionOptions'];
}

export const config: VendureConfig = {
  apiOptions: {
    port: Number(process.env.VENDURE_PORT ?? 3001),
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',
  },
  authOptions: {
    tokenMethod: ['bearer', 'cookie'],
    superadminCredentials: {
      identifier: process.env.VENDURE_SUPERADMIN_USERNAME ?? 'superadmin',
      // dev default; for prod you must set VENDURE_SUPERADMIN_PASSWORD.
      password: process.env.VENDURE_SUPERADMIN_PASSWORD ?? 'superadmin',
    },
    cookieOptions: { secret: process.env.VENDURE_COOKIE_SECRET ?? 'dev-cookie-secret' },
  },
  dbConnectionOptions: dbConnectionOptions(),
  paymentOptions: {
    paymentMethodHandlers: [
      // + StripePlugin handler (env STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET) for tier=full with payments.
    ],
  },
  plugins: [
    DefaultJobQueuePlugin.init({}),
    DefaultSearchPlugin.init({ bufferUpdates: false }),
    AssetServerPlugin.init({ route: 'assets', assetUploadDir: path.join(dirname, 'static', 'assets') }),
    // StripePlugin.init({ storeCustomersInStripe: true }),
  ],
};
