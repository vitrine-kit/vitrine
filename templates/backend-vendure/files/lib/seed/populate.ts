// Демо-каталог Vendure (§18-эквивалент): ТОЛЬКО в dev и при пустой БД
// (идемпотентно). Полное наполнение — Vendure populate(app, initialData,
// productsCsv) или admin-импорт; здесь — гард + точка подключения. Суперадмин
// заводится Vendure из конфигурации (vendure-config.ts, env).
import type { INestApplicationContext } from '@nestjs/common';
import { Logger, ProductService, RequestContextService } from '@vendure/core';

export async function populateDemo(app: INestApplicationContext): Promise<void> {
  if (process.env.NODE_ENV === 'production') return; // никогда на проде

  const ctx = await app.get(RequestContextService).create({ apiType: 'admin' });
  const { totalItems } = await app.get(ProductService).findAll(ctx, { take: 1 });
  if (totalItems > 0) return; // идемпотентно: непустая БД — не трогаем

  Logger.info(
    '[vitrine] Vendure: пустая БД в dev — наполните демо-каталог через ' +
      'populate(app, ./seed/initial-data, ./seed/products.csv) или admin-импорт.',
    'Vitrine',
  );
  // Здесь подключается Vendure populate() с локальными initial-data + products.csv
  // (офлайн, ассеты — в static/). Оставлено как точка интеграции (требует запущенного Vendure).
}
