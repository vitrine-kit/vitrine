// init: creates the client repository skeleton from templates (templates/base +
// templates/backend-<backend>) and installs the chosen features with the SAME primitive as
// add (equivalence guarantee). The template provides the static skeleton (Next/Payload,
// configs, adapters, zero-config dev, Docker); the CLI generates the managed files
// (site.config.ts, vitrine.json, CLAUDE.md, package.json, slots/blueprint/theme).
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Backend, Tier } from '@vitrine-kit/contracts';
import {
  BLUEPRINT_RANGE,
  CLIENT_REACT_RANGE,
  CONTRACTS_RANGE,
  CONTRACTS_VERSION,
  CORE_RANGE,
  KIT_VERSION,
  NEXT_RANGE,
  PAYLOAD_RANGE,
  REACT_RANGE,
} from './kit.js';
import { loadProject } from './project.js';
import type { RegistrySource } from './registry.js';
import { installFeatures, type InstallResult } from './install.js';
import { renderBlueprintFile, renderNeutralTheme, renderSlotsFile } from './generate.js';
import { copyTemplate, hasTemplate, templatesRoot } from './templates.js';
import { exists, sortKeys, writeText } from './util.js';

export interface InitOptions {
  root: string;
  name: string;
  backend: Backend;
  tier: Tier;
  features: string[];
  registry: RegistrySource;
}

export function defaultBackend(tier: Tier): Backend {
  return tier === 'full-store' ? 'vendure' : 'payload';
}

/**
 * Payment-provider features are mutually exclusive (conflicts). The provider is chosen
 * in a separate wizard step (single-select), so they're removed from the general feature list.
 * Order = order in the wizard menu; the first is the default provider.
 */
export const PAYMENT_PROVIDER_FEATURES: string[] = [
  'checkout-stripe',
  'checkout-paddle',
  'checkout-yookassa',
];

export function suggestFeatures(
  tier: Tier,
  registry: RegistrySource,
  backend: Backend = defaultBackend(tier),
): string[] {
  const core = ['catalog', 'product-page', 'seo'];
  // On Vendure, checkout is native (Vendure's Stripe plugin); the checkout-stripe feature is Payload-specific.
  const shop = backend === 'vendure' ? ['cart'] : ['cart', 'checkout-stripe', 'reviews'];
  const desired = tier === 'catalog' ? core : [...core, ...shop];
  return desired.filter((name) => registry.hasFeature(name));
}

/** The client's package.json per backend (deps/scripts). Feature deps are merged by the primitive. */
function clientPackageJson(name: string, backend: Backend): Record<string, unknown> {
  const dependencies: Record<string, string> = {
    '@vitrine-kit/contracts': CONTRACTS_RANGE,
    '@vitrine-kit/core': CORE_RANGE,
  };
  const devDependencies: Record<string, string> = {
    '@types/node': '^20.17.0',
    typescript: '^5.7.2',
  };
  let scripts: Record<string, string> = {};

  if (backend === 'payload') {
    Object.assign(dependencies, {
      '@vitrine-kit/payload-blueprint': BLUEPRINT_RANGE,
      '@payloadcms/db-postgres': PAYLOAD_RANGE,
      '@payloadcms/db-sqlite': PAYLOAD_RANGE,
      '@payloadcms/next': PAYLOAD_RANGE,
      '@payloadcms/richtext-lexical': PAYLOAD_RANGE,
      graphql: '^16.9.0',
      next: NEXT_RANGE,
      payload: PAYLOAD_RANGE,
      react: CLIENT_REACT_RANGE,
      'react-dom': CLIENT_REACT_RANGE,
      sharp: '^0.33.5',
    });
    Object.assign(devDependencies, {
      '@types/react': '^19.0.0',
      '@types/react-dom': '^19.0.0',
      autoprefixer: '^10.4.20',
      postcss: '^8.4.49',
      tailwindcss: '^3.4.17',
    });
    scripts = {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      'generate:types': 'payload generate:types',
      payload: 'payload',
    };
  } else if (backend === 'vendure') {
    Object.assign(dependencies, {
      '@vendure/asset-server-plugin': '^3.0.0',
      '@vendure/core': '^3.0.0',
      'better-sqlite3': '^11.0.0',
      graphql: '^16.9.0',
      next: NEXT_RANGE,
      pg: '^8.13.0',
      react: CLIENT_REACT_RANGE,
      'react-dom': CLIENT_REACT_RANGE,
    });
    Object.assign(devDependencies, {
      '@types/react': '^19.0.0',
      '@types/react-dom': '^19.0.0',
      autoprefixer: '^10.4.20',
      postcss: '^8.4.49',
      tailwindcss: '^3.4.17',
      tsx: '^4.19.2',
    });
    scripts = {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      vendure: 'tsx src/index.ts',
    };
  } else {
    dependencies.react = REACT_RANGE;
  }

  return {
    name,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts,
    dependencies: sortKeys(dependencies),
    devDependencies: sortKeys(devDependencies),
  };
}

/** Base .env.example per backend (feature env merged by the primitive). */
function clientEnvExample(backend: Backend): string {
  if (backend === 'vendure') {
    return [
      '# Project environment.',
      '',
      '# DB. Empty in dev — built-in SQLite (.vitrine/vendure.sqlite).',
      'DATABASE_URL=',
      '',
      '# Vendure Shop API (storefront → server).',
      'VENDURE_SHOP_API_URL=http://localhost:3001/shop-api',
      '',
      '# Vendure superadmin (dev default superadmin/superadmin; change it for prod).',
      'VENDURE_SUPERADMIN_USERNAME=',
      'VENDURE_SUPERADMIN_PASSWORD=',
      'VENDURE_COOKIE_SECRET=',
      '',
      '# Storefront base URL.',
      'NEXT_PUBLIC_SITE_URL=http://localhost:3000',
      '',
    ].join('\n');
  }
  if (backend !== 'payload') {
    return '# Project environment.\nDATABASE_URL=\n';
  }
  return [
    '# Project environment.',
    '',
    '# DB. For local dev you can leave it empty — a SQLite fallback is used (.vitrine/dev.sqlite).',
    'DATABASE_URL=',
    '',
    '# Payload secret (required; generate a random one for prod).',
    'PAYLOAD_SECRET=',
    '',
    '# Dev admin (created only in dev when the DB is empty; the password is printed to the console).',
    'DEV_ADMIN_EMAIL=',
    'DEV_ADMIN_PASSWORD=',
    '',
    '# Site base URL (canonical, OG).',
    'NEXT_PUBLIC_SITE_URL=http://localhost:3000',
    '',
    '# Disable the SQLite fallback even in dev (to catch config typos):',
    '# VITRINE_DB_STRICT=1',
    '',
  ].join('\n');
}

/**
 * The client repository's README — generated (not a static template file), because
 * running/deploying is backend-specific (Payload: /admin + PAYLOAD_SECRET; Vendure:
 * pnpm vendure + Shop API :3001 + VENDURE_*). Created once at init; there are no markers,
 * add/update do NOT rewrite it — the client owns the file and edits it freely.
 */
function clientReadme(name: string, backend: Backend, tier: Tier): string {
  const run =
    backend === 'vendure'
      ? [
          '```bash',
          'pnpm install',
          'cp .env.example .env',
          'pnpm vendure   # Vendure server (Shop API on :3001) — in a separate terminal',
          'pnpm dev       # storefront on :3000',
          '```',
          '',
          'Without Postgres, dev starts a built-in SQLite (`.vitrine/vendure.sqlite`) and',
          'the populate seed. The superadmin comes from `VENDURE_SUPERADMIN_*` (dev default',
          'superadmin/superadmin; change it for prod).',
        ].join('\n')
      : [
          '```bash',
          'pnpm install',
          'cp .env.example .env',
          'pnpm dev',
          '```',
          '',
          '- Storefront: http://localhost:3000',
          '- Admin: http://localhost:3000/admin',
          '',
          'Without Postgres, dev starts a built-in SQLite (`.vitrine/dev.sqlite`), seeds a',
          'demo catalog (5 products, 2 categories) and creates a dev admin (login/password printed',
          'to the console once). Disable the fallback in dev too with `VITRINE_DB_STRICT=1`.',
        ].join('\n');

  const deploySecret =
    backend === 'vendure'
      ? 'export VENDURE_COOKIE_SECRET=...  # Vendure cookie secret'
      : 'export PAYLOAD_SECRET=...         # random Payload secret';

  return `# ${name}

A client project on Vitrine. Backend: \`${backend}\`, tier: \`${tier}\`.
Next.js + Tailwind; features are copied from the Vitrine registry — you own the code and
style it with tokens (\`theme/client.css\`) without changing the logic.

## 1. Prerequisites

Node >= 20 (LTS) and \`pnpm\`. The \`@vitrine-kit/*\` packages are public on npm —
no token is needed to install them.

## 2. Local run (zero-config)

${run}

## 3. Apply the client design

1. Put the brand export (Figma export, screenshots, assets) in \`/design\`.
2. \`vitrine design apply\` — the AI sets token values in \`theme/client.css\`
   (doesn't touch logic/data/routing/a11y). The step is idempotent.

## 4. Features: add, remove, view

\`\`\`bash
vitrine list             # installed + available
vitrine add reviews      # copy a feature: flag, slots, blueprint, env
vitrine remove reviews   # remove (if the feature is removable)
vitrine design apply     # style the new feature
\`\`\`

\`add\` is idempotent and transactional (rollback on error); version originals are written to
\`.vitrine/originals/\` — the basis for 3-way merge on update.

## 5. Updates and checks

\`\`\`bash
vitrine kit update       # update the local registry/templates cache from GitHub
vitrine diff <feature>   # preview a feature update
vitrine update [feature] # 3-way merge of the new feature version (base = your snapshot)
vitrine doctor           # consistency: vitrine.json ↔ files ↔ packages ↔ env
\`\`\`

The \`@vitrine-kit/*\` packages are versioned independently: a fix in \`core\` bumps only
\`@vitrine-kit/core\`, while \`@vitrine-kit/contracts\` stays at its stable version —
update versions in \`package.json\` selectively.

## 6. Deploy (VPS + Docker)

\`\`\`bash
${deploySecret}
docker compose up --build
\`\`\`

Production requires a real \`DATABASE_URL\` — without it the start aborts
(the SQLite fallback is dev-only).
`;
}

function scaffoldBase(opts: InitOptions): void {
  const { root, name, backend, tier } = opts;
  const tRoot = templatesRoot(opts.registry.root);

  // 1) static skeleton from templates (mirrors the client root).
  const baseCopied = hasTemplate(tRoot, 'base');
  if (baseCopied) copyTemplate(tRoot, 'base', root);
  const backendTemplate = `backend-${backend}`;
  if (hasTemplate(tRoot, backendTemplate)) copyTemplate(tRoot, backendTemplate, root);

  // fallback if the template is missing (a minimally valid repository).
  if (!baseCopied) {
    writeText(join(root, '.gitignore'), 'node_modules/\n.next/\ndist/\n.env\n.env.local\n.vitrine/\n');
  }

  // 2) managed/generated files.
  writeText(
    join(root, 'vitrine.json'),
    `${JSON.stringify(
      { kitVersion: KIT_VERSION, contracts: CONTRACTS_VERSION, backend, tier, features: {} },
      null,
      2,
    )}\n`,
  );

  writeText(
    join(root, 'site.config.ts'),
    `import type { SiteConfig } from '@vitrine-kit/contracts';

export const siteConfig: SiteConfig = {
  backend: ${JSON.stringify(backend)},
  tier: ${JSON.stringify(tier)},
  // vitrine:features:start
  features: {},
  // vitrine:features:end
  layout: { sections: [] },
  theme: { name: 'default', cssFile: 'theme/client.css' },
  // vitrine:integrations:start
  integrations: {},
  // vitrine:integrations:end
  i18n: { defaultLocale: 'en', locales: ['en'], currency: 'USD' },
};

export default siteConfig;
`,
  );

  writeText(
    join(root, 'CLAUDE.md'),
    `# ${name}

A Vitrine project. Backend: \`${backend}\`, tier: \`${tier}\`.
This file is the operational guide for the AI agent (Claude Code) and the developer. All
starter-kit operations go through the \`vitrine\` CLI; ready-made flows are the slash commands in \`.claude/commands/\`.

## Installed features
<!-- vitrine:features:start -->
_No features installed yet._
<!-- vitrine:features:end -->

## vitrine CLI commands

| Command | Purpose | When to use | Flags |
|---|---|---|---|
| \`vitrine list\` | Installed and available features | before adding a feature | — |
| \`vitrine add <features…>\` | Copy feature(s): files, flag, slots, blueprint, env, deps | "add feature X" | \`--registry\` |
| \`vitrine remove <feature>\` | Remove a feature (if \`removable\`) | "remove feature X" | \`--registry\` |
| \`vitrine update [features…]\` | Update features via 3-way merge (all if no arguments) | after \`kit update\` | \`--dry-run\`, \`--registry\` |
| \`vitrine diff <feature>\` | Preview an update (without writing) | before \`update\` | \`--registry\` |
| \`vitrine doctor\` | Consistency: \`vitrine.json\` ↔ files ↔ packages ↔ env | after edits, when in doubt | \`--registry\` |
| \`vitrine design apply\` | Apply the design from \`/design\` to tokens (via Claude Code) | after \`add\` or a rebrand | \`--bin\`, \`--dry-run\` |
| \`vitrine kit update\` | Update the local registry/templates cache from GitHub | before updating features | \`--from\`, \`--version\`, \`--channel\` |
| \`vitrine kit status\` | Cache version vs the CLI's expected one | diagnostics | — |
| \`vitrine self-update\` | Update the CLI itself | rarely | \`--dry-run\` |

\`init\` runs once when the repository is created (the \`vitrine init\` wizard). \`add\`/\`update\`
are idempotent and transactional (rollback on error); version originals are written to \`.vitrine/originals/\`
— the base for 3-way merge.

## Common scenarios

- **Project setup** → \`/setup\`: dependencies, \`.env\`, start the dev server.
- **Add and style a feature** → \`/add-feature <name>\`: \`list\` → \`add\` → \`design apply\` → check.
- **Apply/update the design** → \`/design\`: put the export in \`/design\`, \`design apply\`.
- **Update features** → \`/update\`: \`kit update\` → \`diff\` → \`update\` → resolve conflicts → \`doctor\`.
- **Check consistency** → \`/doctor\`.

The full human guide is in \`README.md\`.

## INSTRUCTION: apply the design from /design
Input: everything in \`/design\`.
Task: extract the visual language (palette, typography, spacing, radii, shadows,
the look of specific components) and apply it to the project.
Apply it like this:
  1) set token values in \`theme/client.css\` — the main lever;
  2) only if a token can't express what's needed — add presentational classes
     to a specific component WITHOUT changing its structure.
Do NOT change: component logic, data fetching, adapter calls, routing,
a11y roles/labels, public props. Tokens are the interface.
If the design requires a different section structure — create a section override in the repo
(composition) rather than editing the shared wireframe.
The step is idempotent: re-running converges and doesn't accumulate cruft.

## Boundaries (what the agent must not touch)
- **Generated/managed files — do not edit by hand** (the CLI overwrites them from state):
  \`lib/slots.ts\`, \`lib/payments.ts\`, \`lib/blueprint.ts\`, the managed regions of \`site.config.ts\`
  (\`features\`/\`integrations\`), \`vitrine.json\`, the feature table in this \`CLAUDE.md\`, \`.env*\`.
  The set of features/integrations is changed via \`vitrine add/remove\`, not by editing files.
- **Design — token values only** in \`theme/client.css\` (via \`vitrine design apply\`):
  don't change logic/data/routing/a11y/component structure.
- **Contracts are extended additively** (\`@vitrine-kit/contracts\`): you must not break the shape of existing fields.
- **The user makes commits** — don't run \`git commit\`/\`git push\` without an explicit request.
`,
  );

  writeText(join(root, 'README.md'), clientReadme(name, backend, tier));
  writeText(join(root, 'lib', 'slots.ts'), renderSlotsFile([]));
  writeText(join(root, 'lib', 'blueprint.ts'), renderBlueprintFile([]));
  writeText(join(root, 'theme', 'client.css'), renderNeutralTheme());
  writeText(join(root, '.env.example'), clientEnvExample(backend));
  writeText(join(root, 'package.json'), `${JSON.stringify(clientPackageJson(name, backend), null, 2)}\n`);
}

export function initProject(opts: InitOptions): InstallResult {
  if (exists(opts.root) && readdirSync(opts.root).length > 0) {
    throw new Error(`[vitrine] directory "${opts.root}" is not empty`);
  }
  scaffoldBase(opts);
  const project = loadProject(opts.root);
  return installFeatures(project, opts.features, opts.registry);
}
