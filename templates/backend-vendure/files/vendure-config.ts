// Конфиг Vendure-сервера. БД: Postgres (DATABASE_URL) или встроенный better-sqlite3
// в dev (zero-config, §18-эквивалент). Суперадмин — из env (сменить для прода).
// Stripe-плагин подключается при tier=full с оплатой.
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
    // В production молчаливого fallback на SQLite нет (§18).
    throw new Error('[vitrine] DATABASE_URL обязателен в production');
  }
  // dev zero-config: встроенный SQLite (без сервера БД).
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
      // dev-дефолт; для прода обязательно задать VENDURE_SUPERADMIN_PASSWORD.
      password: process.env.VENDURE_SUPERADMIN_PASSWORD ?? 'superadmin',
    },
    cookieOptions: { secret: process.env.VENDURE_COOKIE_SECRET ?? 'dev-cookie-secret' },
  },
  dbConnectionOptions: dbConnectionOptions(),
  paymentOptions: {
    paymentMethodHandlers: [
      // + StripePlugin handler (env STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET) для tier=full с оплатой.
    ],
  },
  plugins: [
    DefaultJobQueuePlugin.init({}),
    DefaultSearchPlugin.init({ bufferUpdates: false }),
    AssetServerPlugin.init({ route: 'assets', assetUploadDir: path.join(dirname, 'static', 'assets') }),
    // StripePlugin.init({ storeCustomersInStripe: true }),
  ],
};
