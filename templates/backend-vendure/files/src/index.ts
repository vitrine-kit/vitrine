// Бутстрап Vendure-сервера (отдельный процесс: `pnpm vendure`). Витрина Next
// (`pnpm dev`) обращается к Shop API через lib/adapter. В dev на пустой БД —
// демо-populate (гард внутри populateDemo).
import { bootstrap } from '@vendure/core';
import { config } from '../vendure-config.js';
import { populateDemo } from '../lib/seed/populate.js';

bootstrap(config)
  .then(async (app) => {
    await populateDemo(app);
  })
  .catch((err: unknown) => {
    console.error('[vitrine] Vendure bootstrap failed:', err);
    process.exit(1);
  });
