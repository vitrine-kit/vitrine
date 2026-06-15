// Конфиг Payload 3 клиента. Коллекции собирает blueprint (базовые + аддитивные
// расширения фич, lib/blueprint.ts — генерируется CLI). БД выбирается zero-config
// (db.ts → §18.1). onInit запускает демо-сид и dev-админа (только dev).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConfig } from 'payload';
import type { CollectionConfig } from 'payload';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import sharp from 'sharp';
import { collections } from './lib/blueprint.js';
import { resolveDbAdapter } from './lib/adapter/db.js';
import { seedDemo } from './lib/seed/run.js';
import { ensureDevAdmin } from './lib/seed/admin.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  admin: {
    user: 'users',
    importMap: { baseDir: path.resolve(dirname) },
  },
  collections: collections as unknown as CollectionConfig[],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET ?? 'dev-secret-change-me',
  db: await resolveDbAdapter(),
  sharp,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  async onInit(payload) {
    await seedDemo(payload);
    await ensureDevAdmin(payload);
  },
});
