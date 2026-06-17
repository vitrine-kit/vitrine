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

/**
 * Фичи платёжных провайдеров — взаимоисключающие (conflicts). Провайдер выбирается
 * отдельным шагом мастера (single-select), поэтому из общего списка фич их убирают.
 * Порядок = порядок в меню мастера; первый — провайдер по умолчанию.
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

/**
 * README клиентского репозитория — генерируется (не статичный файл шаблона), потому
 * что запуск/деплой backend-специфичны (Payload: /admin + PAYLOAD_SECRET; Vendure:
 * pnpm vendure + Shop API :3001 + VENDURE_*). Создаётся один раз при init; маркеров
 * нет, add/update его НЕ переписывают — клиент владеет файлом и правит свободно.
 */
function clientReadme(name: string, backend: Backend, tier: Tier): string {
  const run =
    backend === 'vendure'
      ? [
          '```bash',
          'pnpm install',
          'cp .env.example .env',
          'pnpm vendure   # Vendure-сервер (Shop API на :3001) — в отдельном терминале',
          'pnpm dev       # витрина на :3000',
          '```',
          '',
          'Без Postgres dev поднимает встроенный SQLite (`.vitrine/vendure.sqlite`) и',
          'populate-сид. Суперадмин — из `VENDURE_SUPERADMIN_*` (dev-дефолт',
          'superadmin/superadmin; смените для прода).',
        ].join('\n')
      : [
          '```bash',
          'pnpm install',
          'cp .env.example .env',
          'pnpm dev',
          '```',
          '',
          '- Витрина: http://localhost:3000',
          '- Админка: http://localhost:3000/admin',
          '',
          'Без Postgres dev поднимает встроенный SQLite (`.vitrine/dev.sqlite`), заполняет',
          'демо-каталог (5 товаров, 2 категории) и заводит dev-админа (логин/пароль печатаются',
          'в консоль один раз). Отключить fallback и в dev — `VITRINE_DB_STRICT=1`.',
        ].join('\n');

  const deploySecret =
    backend === 'vendure'
      ? 'export VENDURE_COOKIE_SECRET=...  # секрет cookie Vendure'
      : 'export PAYLOAD_SECRET=...         # случайный секрет Payload';

  return `# ${name}

Клиентский проект на Vitrine. Backend: \`${backend}\`, уровень: \`${tier}\`.
Next.js + Tailwind; фичи скопированы из реестра Vitrine — вы владеете кодом и
стилизуете его токенами (\`theme/client.css\`), не меняя логику.

## 1. Предусловия

Приватные пакеты \`@maks417/*\` тянутся из GitHub Packages — нужен PAT с правом
\`read:packages\` (используется \`.npmrc\`, scope \`@maks417\`):

\`\`\`bash
export GITHUB_TOKEN=...
\`\`\`

## 2. Локальный запуск (zero-config)

${run}

## 3. Применить дизайн клиента

1. Положите экспорт бренда (Figma export, скриншоты, ассеты) в \`/design\`.
2. \`vitrine design apply\` — ИИ задаёт значения токенов в \`theme/client.css\`
   (логику/данные/роутинг/a11y не трогает). Шаг идемпотентен.

## 4. Фичи: добавить, убрать, посмотреть

\`\`\`bash
vitrine list             # установленные + доступные
vitrine add reviews      # скопировать фичу: флаг, слоты, blueprint, env
vitrine remove reviews   # убрать (если фича removable)
vitrine design apply     # стилизовать новую фичу
\`\`\`

\`add\` идемпотентен и транзакционен (откат при ошибке); оригиналы версий пишутся в
\`.vitrine/originals/\` — основа для 3-way merge при обновлении.

## 5. Обновления и проверка

\`\`\`bash
vitrine kit update       # обновить локальный кэш реестра/шаблонов с GitHub
vitrine diff <feature>   # предпросмотр обновления фичи
vitrine update [feature] # 3-way merge новой версии фичи (база = ваш снапшот)
vitrine doctor           # консистентность vitrine.json ↔ файлы ↔ пакеты ↔ env
\`\`\`

Пакеты \`@maks417/*\` версионируются независимо: фикс в \`core\` поднимает только
\`@maks417/core\`, а \`@maks417/contracts\` остаётся на своей стабильной версии —
обновляйте версии в \`package.json\` точечно.

## 6. Деплой (VPS + Docker)

\`\`\`bash
export GITHUB_TOKEN=...           # PAT read:packages (build-arg для приватных пакетов)
${deploySecret}
docker compose up --build
\`\`\`

Production требует реальный \`DATABASE_URL\` — без него старт прерывается
(SQLite-fallback только в dev).
`;
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
  // vitrine:integrations:start
  integrations: {},
  // vitrine:integrations:end
  i18n: { defaultLocale: 'ru', locales: ['ru'], currency: 'RUB' },
};

export default siteConfig;
`,
  );

  writeText(
    join(root, 'CLAUDE.md'),
    `# ${name}

Проект на Vitrine. Backend: \`${backend}\`, уровень: \`${tier}\`.
Этот файл — операционный гайд для ИИ-агента (Claude Code) и разработчика. Все операции со
стартер-китом выполняются через CLI \`vitrine\`; готовые потоки — слэш-командами в \`.claude/commands/\`.

## Установленные фичи
<!-- vitrine:features:start -->
_Фичи ещё не установлены._
<!-- vitrine:features:end -->

## Команды vitrine CLI

| Команда | Назначение | Когда звать | Флаги |
|---|---|---|---|
| \`vitrine list\` | Установленные и доступные фичи | перед добавлением фичи | — |
| \`vitrine add <features…>\` | Скопировать фичу(и): файлы, флаг, слоты, blueprint, env, deps | «добавь фичу X» | \`--registry\` |
| \`vitrine remove <feature>\` | Убрать фичу (если \`removable\`) | «убери фичу X» | \`--registry\` |
| \`vitrine update [features…]\` | Обновить фичи 3-way merge (без аргументов — все) | после \`kit update\` | \`--dry-run\`, \`--registry\` |
| \`vitrine diff <feature>\` | Предпросмотр обновления (без записи) | перед \`update\` | \`--registry\` |
| \`vitrine doctor\` | Консистентность: \`vitrine.json\` ↔ файлы ↔ пакеты ↔ env | после правок, при сомнениях | \`--registry\` |
| \`vitrine design apply\` | Применить дизайн из \`/design\` к токенам (через Claude Code) | после \`add\` или смены бренда | \`--bin\`, \`--dry-run\` |
| \`vitrine kit update\` | Обновить локальный кэш реестра/шаблонов с GitHub | перед обновлением фич | \`--from\`, \`--version\`, \`--channel\` |
| \`vitrine kit status\` | Версия кэша vs ожидаемая CLI | диагностика | — |
| \`vitrine self-update\` | Обновить сам CLI | редко | \`--dry-run\` |

\`init\` запускается один раз при создании репозитория (визард \`vitrine init\`). \`add\`/\`update\`
идемпотентны и транзакционны (откат при ошибке); оригиналы версий пишутся в \`.vitrine/originals/\`
— база для 3-way merge.

## Типовые сценарии

- **Настройка проекта** → \`/setup\`: зависимости, GitHub PAT, \`.env\`, запуск dev-сервера.
- **Добавить и стилизовать фичу** → \`/add-feature <имя>\`: \`list\` → \`add\` → \`design apply\` → проверка.
- **Применить/обновить дизайн** → \`/design\`: положить экспорт в \`/design\`, \`design apply\`.
- **Обновить фичи** → \`/update\`: \`kit update\` → \`diff\` → \`update\` → разрулить конфликты → \`doctor\`.
- **Проверить консистентность** → \`/doctor\`.

Полный гайд для человека — в \`README.md\`.

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

## Границы (что агенту нельзя трогать)
- **Генерируемые/управляемые файлы — руками не править** (CLI перезатрёт из состояния):
  \`lib/slots.ts\`, \`lib/payments.ts\`, \`lib/blueprint.ts\`, управляемые регионы \`site.config.ts\`
  (\`features\`/\`integrations\`), \`vitrine.json\`, таблица фич в этом \`CLAUDE.md\`, \`.env*\`.
  Набор фич/интеграций меняется через \`vitrine add/remove\`, а не правкой файлов.
- **Дизайн — только значения токенов** в \`theme/client.css\` (через \`vitrine design apply\`):
  логику/данные/роутинг/a11y/структуру компонентов не менять.
- **Контракты расширяются аддитивно** (\`@maks417/contracts\`): ломать форму существующих полей нельзя.
- **Коммиты делает пользователь** — не запускай \`git commit\`/\`git push\` без явной просьбы.
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
    throw new Error(`[vitrine] каталог "${opts.root}" не пустой`);
  }
  scaffoldBase(opts);
  const project = loadProject(opts.root);
  return installFeatures(project, opts.features, opts.registry);
}
