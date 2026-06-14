// init: создаёт скелет клиентского репозитория и ставит выбранные фичи ТЕМ ЖЕ
// примитивом, что и add (гарантия эквивалентности). Полноценные Next/Payload
// шаблоны — M5; здесь минимальный валидный скелет.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Backend, Tier } from '@maks417/contracts';
import { CONTRACTS_RANGE, CORE_RANGE, BLUEPRINT_RANGE, KIT_VERSION, CONTRACTS_VERSION, REACT_RANGE } from './kit.js';
import { loadProject } from './project.js';
import type { RegistrySource } from './registry.js';
import { installFeatures, type InstallResult } from './install.js';
import { renderBlueprintFile, renderNeutralTheme, renderSlotsFile } from './generate.js';
import { exists, writeText } from './util.js';

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

export function suggestFeatures(tier: Tier, registry: RegistrySource): string[] {
  const core = ['catalog', 'product-page', 'seo'];
  const shop = ['cart', 'checkout-stripe', 'reviews'];
  const desired = tier === 'catalog' ? core : [...core, ...shop];
  return desired.filter((name) => registry.hasFeature(name));
}

function scaffoldBase(opts: InitOptions): void {
  const { root, name, backend, tier } = opts;

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
  writeText(
    join(root, '.env.example'),
    `# Окружение проекта. Для локального dev DATABASE_URL можно оставить пустым (SQLite-fallback).\nDATABASE_URL=\n`,
  );
  writeText(
    join(root, '.gitignore'),
    `node_modules/\n.next/\ndist/\n.env\n.env.local\n.vitrine/\n`,
  );
  writeText(join(root, '.npmrc'), `@maks417:registry=https://npm.pkg.github.com\n`);

  const deps: Record<string, string> = {
    '@maks417/contracts': CONTRACTS_RANGE,
    '@maks417/core': CORE_RANGE,
    react: REACT_RANGE,
  };
  if (backend === 'payload') deps['@maks417/payload-blueprint'] = BLUEPRINT_RANGE;
  writeText(
    join(root, 'package.json'),
    `${JSON.stringify(
      { name, version: '0.1.0', private: true, type: 'module', dependencies: deps },
      null,
      2,
    )}\n`,
  );
}

export function initProject(opts: InitOptions): InstallResult {
  if (exists(opts.root) && readdirSync(opts.root).length > 0) {
    throw new Error(`[vitrine] каталог "${opts.root}" не пустой`);
  }
  scaffoldBase(opts);
  const project = loadProject(opts.root);
  return installFeatures(project, opts.features, opts.registry);
}
