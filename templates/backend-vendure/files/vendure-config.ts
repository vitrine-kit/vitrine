// Vendure server config. DB: Postgres (DATABASE_URL) or the embedded better-sqlite3
// in dev (zero-config, §18 equivalent). Superadmin — from env (change it for prod).
// The Stripe plugin is wired in at tier=full with payments.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DefaultJobQueuePlugin, DefaultSearchPlugin, type VendureConfig } from '@vendure/core';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { checkRateLimit } from '@vitrine-kit/core';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const IS_DEV = process.env.NODE_ENV !== 'production';

// Structural Express req/res shape — avoids a direct dependency on `express` (it's only a
// transitive dep of @vendure/core); any real Express Request/Response satisfies this.
interface MiddlewareRequest {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}
interface MiddlewareResponse {
  setHeader(name: string, value: string): void;
  status(code: number): { json(body: unknown): void };
}

// Coarse per-IP rate limit on the whole admin API — brute-force protection for the
// superadmin login mutation (Vendure has no built-in login lockout, unlike Payload).
function adminApiRateLimit(req: MiddlewareRequest, res: MiddlewareResponse, next: () => void): void {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0].trim()) ?? req.ip ?? 'unknown';
  const { allowed, retryAfterMs } = checkRateLimit(`admin-api:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!allowed) {
    res.setHeader('Retry-After', String(Math.ceil((retryAfterMs ?? 0) / 1000)));
    res.status(429).json({ error: 'too many requests' });
    return;
  }
  next();
}

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

if (!IS_DEV) {
  // No silent fallback to the well-known dev defaults in production (mirrors the DATABASE_URL guard below).
  if (!process.env.VENDURE_SUPERADMIN_PASSWORD) {
    throw new Error('[vitrine] VENDURE_SUPERADMIN_PASSWORD is required in production');
  }
  if (!process.env.VENDURE_COOKIE_SECRET) {
    throw new Error('[vitrine] VENDURE_COOKIE_SECRET is required in production');
  }
}

export const config: VendureConfig = {
  apiOptions: {
    port: Number(process.env.VENDURE_PORT ?? 3001),
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',
    middleware: [{ handler: adminApiRateLimit, route: 'admin-api' }],
  },
  authOptions: {
    tokenMethod: ['bearer', 'cookie'],
    superadminCredentials: {
      identifier: process.env.VENDURE_SUPERADMIN_USERNAME ?? 'superadmin',
      // dev default; production is guarded above.
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
