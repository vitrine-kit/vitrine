// Vendure server bootstrap (separate process: `pnpm vendure`). The Next storefront
// (`pnpm dev`) talks to the Shop API via lib/adapter. In dev with an empty DB —
// demo populate (guarded inside populateDemo).
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
