// Dev admin (§18.3): dev only + empty users collection. Password from
// DEV_ADMIN_PASSWORD, otherwise random (no well-known default), printed
// to the console once.
import { randomBytes } from 'node:crypto';
import type { Payload } from 'payload';
import { shouldRunDevTask } from './guards.js';

function randomPassword(length = 16): string {
  return randomBytes(length).toString('base64url').slice(0, length);
}

export async function ensureDevAdmin(payload: Payload): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';
  const { totalDocs } = await payload.count({ collection: 'users' });
  if (!shouldRunDevTask({ isProd, existingCount: totalDocs })) return;

  const email = process.env.DEV_ADMIN_EMAIL ?? 'admin@dev.local';
  const password = process.env.DEV_ADMIN_PASSWORD ?? randomPassword();
  await payload.create({ collection: 'users', data: { email, password } });
  payload.logger.warn(
    `[vitrine] DEV ADMIN ${email} / ${password} — development only, change before deploying`,
  );
}
