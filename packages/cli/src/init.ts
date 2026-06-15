// init: создаёт скелет клиентского репозитория из шаблонов (templates/base +
// templates/backend-<backend>) и ставит выбранные фичи ТЕМ ЖЕ примитивом, что и
// add (гарантия эквивалентности). Шаблон даёт статический каркас (Next/Payload,
// конфиги, адаптеры, zero-config dev, Docker); CLI генерирует управляемые файлы
// (site.config.ts, vitrine.json, CLAUDE.md, package.json, slots/blueprint/theme).
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Backend, Tier } from '@maks417/contracts';
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

export function suggestFeatures(
  tier: Tier,
  registry: RegistrySource,
  backend: Backend = defaultBackend(tier),
): string[] {
  const core = ['catalog', 'product-page', 'seo'];
  // На Vendure оформление — нативное (Stripe-плагин Vendure); фича checkout-stripe Payload-специфична.
  const shop = backend === 'vendure' ? ['cart'] : ['cart', 'checkout-stripe', 'reviews'];
  const desired = tier === 'catalog' ? core : [...core, ...shop];
  return desired.filter((name) => registry.hasFeature(name));
}

/** package.json клиента под backend (deps/scripts). Feature-deps домержит примитив. */
function clientPackageJson(name: string, backend: Backend): Record<string, unknown> {
  const dependencies: Record<string, string> = {
    '@maks417/contracts': CONTRACTS_RANGE,
    '@maks417/core': CORE_RANGE,
  };
  const devDependencies: Record<string, string> = {
    '@types/node': '^20.17.0',
    typescript: '^5.7.2',
  };
  let scripts: Record<string, string> = {};

  if (backend === 'payload') {
    Object.assign(dependencies, {
      '@maks417/payload-blueprint': BLUEPRINT_RANGE,
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

/** Базовый .env.example под backend (feature-env домержит примитив). */
function clientEnvExample(backend: Backend): string {
  if (backend === 'vendure') {
    return [
      '# Окружение проекта.',
      '# Приватные пакеты @maks417/* требуют GitHub PAT (read:packages): export GITHUB_TOKEN=...',
      '',
      '# БД. Пусто в dev — встроенный SQLite (.vitrine/vendure.sqlite).',
      'DATABASE_URL=',
      '',
      '# Vendure Shop API (витрина → сервер).',
      'VENDURE_SHOP_API_URL=http://localhost:3001/shop-api',
      '',
      '# Суперадмин Vendure (dev-дефолт superadmin/superadmin; смените для прода).',
      'VENDURE_SUPERADMIN_USERNAME=',
      'VENDURE_SUPERADMIN_PASSWORD=',
      'VENDURE_COOKIE_SECRET=',
      '',
      '# Базовый URL витрины.',
      'NEXT_PUBLIC_SITE_URL=http://localhost:3000',
      '',
    ].join('\n');
  }
  if (backend !== 'payload') {
    return '# Окружение проекта.\nDATABASE_URL=\n';
  }
  return [
    '# Окружение проекта.',
    '# Приватные пакеты @maks417/* требуют GitHub PAT (read:packages):',
    '#   export GITHUB_TOKEN=...   (используется .npmrc)',
    '',
    '# БД. Для локального dev можно оставить пустым — будет SQLite-fallback (.vitrine/dev.sqlite).',
    'DATABASE_URL=',
    '',
    '# Секрет Payload (обязателен; сгенерируйте случайный для прода).',
    'PAYLOAD_SECRET=',
    '',
    '# Dev-админ (создаётся только в dev при пустой БД; пароль печатается в консоль).',
    'DEV_ADMIN_EMAIL=',
    'DEV_ADMIN_PASSWORD=',
    '',
    '# Базовый URL сайта (canonical, OG).',
    'NEXT_PUBLIC_SITE_URL=http://localhost:3000',
    '',
    '# Отключить SQLite-fallback даже в dev (ловить опечатки конфига):',
    '# VITRINE_DB_STRICT=1',
    '',
  ].join('\n');
}

function scaffoldBase(opts: InitOptions): void {
  const { root, name, backend, tier } = opts;
  const tRoot = templatesRoot(opts.registry.root);

  // 1) статический каркас из шаблонов (мирроит корень клиента).
  const baseCopied = hasTemplate(tRoot, 'base');
  if (baseCopied) copyTemplate(tRoot, 'base', root);
  const backendTemplate = `backend-${backend}`;
  if (hasTemplate(tRoot, backendTemplate)) copyTemplate(tRoot, backendTemplate, root);

  // fallback на случай отсутствия шаблона (минимально валидный репозиторий).
  if (!baseCopied) {
    writeText(join(root, '.gitignore'), 'node_modules/\n.next/\ndist/\n.env\n.env.local\n.vitrine/\n');
    writeText(join(root, '.npmrc'), '@maks417:registry=https://npm.pkg.github.com\n');
  }

  // 2) управляемые/генерируемые файлы.
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
    `import type { SiteConfig } from '@maks417/contracts';

export const siteConfig: SiteConfig = {
  backend: ${JSON.stringify(backend)},
  tier: ${JSON.stringify(tier)},
  // vitrine:features:start
  features: {},
  // vitrine:features:end
  layout: { sections: [] },
  theme: { name: 'default', cssFile: 'theme/client.css' },
  integrations: {},
  i18n: { defaultLocale: 'ru', locales: ['ru'], currency: 'RUB' },
};

export default siteConfig;
`,
  );

  writeText(
    join(root, 'CLAUDE.md'),
    `# ${name}

Проект на Vitrine. Backend: \`${backend}\`, уровень: \`${tier}\`.

## Установленные фичи
<!-- vitrine:features:start -->
_Фичи ещё не установлены._
<!-- vitrine:features:end -->

## ИНСТРУКЦИЯ: применить дизайн из /design
Вход: всё в \`/design\`.
Задача: извлечь визуальный язык (палитра, типографика, отступы, радиусы, тени,
вид конкретных компонентов) и применить к проекту.
Применять так:
  1) задать значения токенов в \`theme/client.css\` — основной рычаг;
  2) только если токен не выражает нужное — добавить презентационные классы
     конкретному компоненту, НЕ меняя его структуру.
НЕ менять: логику компонентов, выборку данных, вызовы адаптера, роутинг,
a11y-роли/лейблы, публичные пропсы. Токены — это интерфейс.
Если дизайн требует иной структуры секции — создать override секции в репозитории
(композиция), а не править общий wireframe.
Шаг идемпотентен: повторный прогон сходится, не накапливает мусор.
`,
  );

  writeText(join(root, 'lib', 'slots.ts'), renderSlotsFile([]));
  writeText(join(root, 'lib', 'blueprint.ts'), renderBlueprintFile([]));
  writeText(join(root, 'theme', 'client.css'), renderNeutralTheme());
  writeText(join(root, '.env.example'), clientEnvExample(backend));
  writeText(join(root, 'package.json'), `${JSON.stringify(clientPackageJson(name, backend), null, 2)}\n`);
}

export function initProject(opts: InitOptions): InstallResult {
  if (exists(opts.root) && readdirSync(opts.root).length > 0) {
    throw new Error(`[vitrine] каталог "${opts.root}" не пустой`);
  }
  scaffoldBase(opts);
  const project = loadProject(opts.root);
  return installFeatures(project, opts.features, opts.registry);
}
