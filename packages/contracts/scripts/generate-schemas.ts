// Generates JSON Schema from the contracts' zod schemas (single source of truth, §13).
// Run: pnpm --filter @vitrine-kit/contracts schemas  (or turbo run schemas).
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodTypeAny } from 'zod';

import { siteConfigSchema } from '../src/config.js';
import {
  featureManifestSchema,
  vitrineLockSchema,
  registryIndexSchema,
} from '../src/manifest.js';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../../../schemas');

const targets: Array<{ file: string; name: string; schema: ZodTypeAny }> = [
  { file: 'site.config.schema.json', name: 'SiteConfig', schema: siteConfigSchema },
  { file: 'feature.schema.json', name: 'FeatureManifest', schema: featureManifestSchema },
  { file: 'vitrine.schema.json', name: 'VitrineLock', schema: vitrineLockSchema },
  { file: 'registry-index.schema.json', name: 'RegistryIndex', schema: registryIndexSchema },
];

mkdirSync(outDir, { recursive: true });

for (const { file, name, schema } of targets) {
  const json = zodToJsonSchema(schema, { name, $refStrategy: 'none' });
  writeFileSync(resolve(outDir, file), `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  console.log(`[schemas] ${file}`);
}

console.log(`[schemas] done → ${outDir}`);
