// Dev-админ (§18.3): только dev + пустая коллекция users. Пароль из
// DEV_ADMIN_PASSWORD, иначе случайный (нет общеизвестного дефолта), печатается
// один раз в консоль.
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
    `[vitrine] DEV ADMIN ${email} / ${password} — только для разработки, смените перед деплоем`,
  );
}
