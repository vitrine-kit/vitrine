# Vitrine — план реализации (implementation plan)

> Компаньон к `vitrine-starter-kit-spec.md` (v0.2). Переводит дизайн-спеку в исполнимую инженерную последовательность.
> Язык — русский с английскими техническими терминами, как в спеке. Могу пересобрать на английском, если так удобнее команде.
> Оценки даны в относительных размерах (S/M/L/XL), а не в днях — точные числа требуют состава команды (как и финмодель в §3 спеки — намеренно не выдуманы).

---

## 0. Краткая выжимка: где находится сложность

Спека описывает **не приложение, а конвейер производства приложений**. Поэтому 80% инженерного риска сидит в четырёх артефактах, а не в фичах магазина:

| Линчпин | Почему критичен | Где в спеке |
|---|---|---|
| **`@maks417/contracts` — 5 контрактов** | Сломанный контракт ломает `add` у всех клиентов. Должны быть зафиксированы рано и расти **только аддитивно** под semver. | §5, §13 |
| **Примитив установки фичи** | Сердце CLI. `init` и `add` — тонкие обёртки над ним. Должен быть идемпотентным, частично-транзакционным, декларативным. | §8, §9 |
| **Zero-config dev** | Делает любой сгенерированный сайт демонстрируемым одной командой без Postgres. Это то, что превращает «скаффолд» в «работающий продукт». | §10, §18 |
| **`update` + 3-way merge** | Единственная «цена» copy-in модели. Самый тяжёлый отложенный кусок; требует хранения pristine-оригиналов. | §7, §9 |

**Критический путь:** `contracts` → `core`/`blueprint` → примитив установки → шаблоны + zero-config → эталонный клиент-каталог end-to-end. Всё остальное (другие фичи, дизайн-шаг, `update`, Vendure) навешивается на этот хребет.

**Принцип, который нельзя нарушать (из §4):** в **пакеты** — то, где баг = инцидент у всех (платёж, заказ, контракт); в **реестр** — то, что расходится под клиента (вид, секции). Каждое решение «куда положить код» сверяем с этим правилом.

---

## 1. Фундаментальные технические решения (рекомендации к фиксации до старта)

Спека сознательно не выбирает инструменты CLI/монорепо. Рекомендую зафиксировать следующее **до** M0 — это решения, которые дорого менять позже. Параметры, по которым стейкхолдеры уже дали выбор (реестр, рантайм, хостинг, Vendure, design apply, слоты/токены), сведены в **§10**.

| Область | Рекомендация | Обоснование |
|---|---|---|
| Монорепо | **pnpm workspaces + Turborepo** | pnpm — строгие зависимости (фича не «дотянется» мимо контрактов случайно), Turbo — кэш сборки/тестов |
| Версии/релизы | **Changesets** | Прямо назван в спеке (§6, §12); аддитивный semver под контракты |
| Сборка пакетов | **tsup** (esbuild) + `tsc --emitDeclarationOnly` для типов | быстрый бандл + честные `.d.ts` для контрактов |
| CLI-движок | **@clack/prompts** (визард) + **commander** (роутинг команд) | clack даёт качественный multistep-визард (§10), commander — простой парсинг под `vitrine <cmd>` |
| Схемы/валидация | **zod как единый источник** → генерация JSON Schema (`zod-to-json-schema`) в `schemas/` | устраняет дрейф между runtime-валидацией и JSON Schema (§13); агент валидирует вывод одной правдой |
| Правки TS-файлов (`site.config.ts`, `lib/slots.ts`) | **Управляемые блоки-маркеры** (`// vitrine:slots:start … :end`), которые CLI владеет и переписывает детерминированно; **ts-morph** только там, где маркер не подходит | спека сама закладывает «явные маркеры вставки» (§8, §13); маркер-блок идемпотентнее свободного AST-кодомода |
| 3-way merge | **node-diff3** + хранение pristine-оригиналов в репо клиента (`.vitrine/originals/<feature>@<version>/`) | кэш привязан к релизу и может не иметь произвольной старой версии → base берём из репо, не из кэша |
| App-стек шаблона | **Next.js (App Router) + Tailwind + shadcn-стиль + Payload 3** | прямо из §14 ADR; Payload 3 — Next-native, один деплой |
| БД | **Postgres (prod) / SQLite (dev-fallback)** через `@payloadcms/db-postgres` + `@payloadcms/db-sqlite` | §18 даёт готовый код `resolveDbAdapter` |
| Тесты | **vitest** (unit), **playwright** (e2e эталонного клиента), CLI-интеграции против temp-директорий | примитив установки обязан иметь интеграционные тесты «на временном репо» |
| Платежи | **Stripe hosted checkout** + вебхук в `@maks417/core` | §14; минимальная PCI-нагрузка |

> ⚠️ Решения, требующие подтверждения стейкхолдеров до кода — см. §10 этого плана (имя npm-scope `@org`, приватный реестр = GitHub Packages, минимальные версии Node/PM, юр-проверка лицензий Vendure GPL-3.0).

---

## 2. Скелет монорепо (создаётся в M0)

```
vitrine/                       # github.com/org/vitrine
├─ packages/
│  ├─ contracts/               # @maks417/contracts
│  ├─ core/                    # @maks417/core
│  ├─ payload-blueprint/       # @maks417/payload-blueprint
│  └─ cli/                     # @maks417/vitrine
├─ registry/                   # copy-in фичи (+ _index.json)
├─ templates/                  # base, backend-payload, (позже) backend-vendure
├─ sandbox/                    # площадка core-разработки на контрактах
├─ schemas/                    # сгенерированные JSON Schema (feature/vitrine/site.config)
├─ .changeset/
├─ .github/workflows/          # CI: build/test/publish + registry tarball к релизу
├─ pnpm-workspace.yaml
├─ turbo.json
└─ package.json
```

---

## 3. Фазовый план (M0–M10)

Маппинг на дорожную карту спеки §16, но с инженерной детализацией: deliverables + ключевые интерфейсы + критерии приёмки (DoD).

### M0 — Бутстрап монорепо · `S`
**Deliverables:** скелет из §2; pnpm/turbo/tsconfig base; Changesets; CI-каркас (lint+typecheck+test на PR); пустые пакеты с `package.json` и `publishConfig` под приватный реестр.
**DoD:** `pnpm i && pnpm build && pnpm test` зелёные на пустом каркасе; CI гоняет на PR.

### M1 — `@maks417/contracts` (5 контрактов) · `L` · *роадмап п.1*
Самый важный пакет. Здесь только **типы и API-поверхности**, минимум рантайма.
**Deliverables:**
- **1 · Tokens** — имена CSS-переменных / Tailwind-preset (палитра, типографика, отступы, радиусы, тени, плотность). Контракт = список имён токенов + типизированный preset; значения живут в `theme/<client>.css` клиента.
- **2 · Data** — `CatalogSource`, `CommerceBackend` (выдержка кода уже в §5) + нормализованные типы `Product / Variant / Cart / Order / Category / ProductQuery`.
- **3 · Slots** — каталог имён слотов (`product.below-description`, `home.hero`, …) + типы `SlotRegistration`, API регистрации/чтения.
- **4 · Config** — zod-схема `SiteConfig` (`backend`, `tier`, `features`, `layout.sections`, `theme`, `integrations`, `i18n`) → из неё генерится JSON Schema.
- **5 · Blueprint** — типы `extend('product', { addFields })` (аддитивное расширение коллекций).
- `zod`-схемы → `schemas/*.json` через build-step.
- **Замороженный v1-список** имён слотов и токенов (решение №6): замкнутый минимальный набор предлагается и фиксируется здесь, под semver. Расширение — только аддитивное.
**DoD:** типы компилируются; JSON Schema сгенерированы и провалидированы примером; v1-список слотов/токенов утверждён на ревью; первый changeset `1.0.0`; README с гарантией semver (аддитивность).
**Риск-гейт:** ревью контрактов всеми ролями — это API, который потом нельзя ломать.

### M2 — `@maks417/core` + `@maks417/payload-blueprint` · `L` · *роадмап п.2*
**`@maks417/core` deliverables:**
- Runtime слотов: реестр `registerSlot()` + серверный компонент `<Slot name=… />`, рендерящий зарегистрированное по `order`.
- Runtime адаптера: фабрика/DI, отдающая активный `CatalogSource`/`CommerceBackend` по `site.config`.
- Order pipeline + Stripe webhook handler (используется в M8, но каркас здесь — критлогика обязана жить в пакете).
**`@maks417/payload-blueprint` deliverables:**
- Базовые Payload-коллекции: `products`, `variants`, `categories`, `media`, `users`, `orders`.
- Реализация `extend()`: централизованный реестр расширений, который Payload-конфиг клиента собирает в финальные коллекции.
**DoD:** в `sandbox/` слот рендерит тестовый компонент; `extend('product',{addFields})` аддитивно добавляет поле без поломки базовой коллекции; unit-тесты пайплайна заказа (моки Stripe).

### M3 — Каталожный реестр: `catalog`, `product-page`, `seo` · `M` · *роадмап п.3*
Первые фичи реестра — эталон, по которому пишутся все следующие. Зависят **только** от контрактов.
**Deliverables на фичу:** `feature.json` (по схеме из §8) + `files/` (wireframe-компоненты: функционально полные, a11y-полные, визуально нейтральные — токены стартуют пустыми) + биндинг к `CatalogSource` + регистрация слотов + `docs/*.md` для `CLAUDE.md`.
**DoD:** каждая фича устанавливается в sandbox вручную (до CLI) и работает на `PayloadCatalog*`-адаптере; `feature.json` валиден против схемы.

### M4 — `@maks417/vitrine` CLI: примитив установки → `init` + `add` · `XL` · *роадмап п.4*
**Сердце системы.** Сначала примитив, потом обёртки. Детали примитива — §4 этого плана.
**Deliverables:**
- **Feature-install primitive** (7 шагов §9): резолв зависимостей (registry+core+npm) → копирование `files` → флаг в `site.config` → регистрация слотов → аддитивный blueprint-extend → сбор env+npm → запись `vitrine.json`+`CLAUDE.md`. Идемпотентный, с откатом при падении.
- `vitrine add <feature...>` — прямой вызов примитива в текущем репо.
- `vitrine init [name]` — визард (13 шагов §10) поверх того же примитива. Гарантия: «добавлено визардом» ≡ «добавлено позже».
- `vitrine list`, `vitrine remove <feature>` (если `removable`).
**DoD:** интеграционный тест: `init` во временную папку → `add reviews` → структура файлов, `vitrine.json`, слоты, флаги совпадают с ожидаемым снапшотом; повторный `add reviews` — no-op (идемпотентность); падение на шаге N откатывает шаги 1..N-1.

### M5 — Шаблоны + zero-config dev + эталонный клиент e2e · `XL` · *роадмап п.5*
**Deliverables:**
- `templates/base` (Next+Tailwind каркас, `site.config.ts`, `CLAUDE.md`, `theme/<client>.css` нейтральный, `.env.example`, `.gitignore` с `.vitrine/`).
- `templates/backend-payload` (Payload-конфиг, `lib/adapter/*`, `app/(payload)/admin`).
- **Zero-config dev** (§18): `resolveDbAdapter` (Postgres-detect + SQLite-fallback, hard-error в prod), `seedDemo` (5 товаров + 2 категории + локальные placeholder-SVG), `ensureDevAdmin` (случайный пароль, печать один раз) — оба из `onInit` Payload, гарды «только dev + пустая коллекция».
- Эталонный клиент-каталог, собранный визардом, задеплоенный на **VPS + Docker** (`Dockerfile` + `docker-compose.yml`: app + Postgres) — выбранный хостинг-таргет.
**DoD:** `vitrine init` → `pnpm dev` → `localhost:3000` с 5 демо-товарами и рабочей `/admin` **без Postgres**; задание `DATABASE_URL` переключает на Postgres; в `NODE_ENV=production` пустой `DATABASE_URL` = hard error; сид/dev-админ не запускаются в prod; `docker compose up` поднимает эталон на VPS с реальным Postgres.

### M6 — Дизайн-пайплайн · `M` · *роадмап п.6*
**Deliverables:**
- Блок «ИНСТРУКЦИЯ: применить дизайн из /design» в `CLAUDE.md` (генерится визардом, дополняется `add`) — с жёсткими ограничениями из §11.
- `vitrine design apply` — **обёртка над Claude Code**: CLI шеллит в установленный Claude Code, передаёт инструкцию из `CLAUDE.md` + `/design`; агент задаёт **только значения токенов** в `theme/<client>.css`/preset; идемпотентен. (Своя Anthropic-интеграция/API-ключ не нужны; если Claude Code не найден — внятная ошибка с подсказкой установки.)
- Пустая `/design` с README; изоляция от поведения.
**DoD:** прогон на эталонном клиенте меняет облик через токены; поведение/данные/роутинг/a11y/пропсы не тронуты; повторный прогон сходится (диф-проверка идемпотентности).

### M7 — `kit update` + `vitrine.json` + `doctor` · `M` · *роадмап п.7*
**Deliverables:**
- `vitrine kit update [--version|--channel]` — тянет immutable tarball GitHub-релиза в `~/.vitrine/`, печатает changelog, проверяет версию CLI; авторизация приватного репо через `gh`/git-creds.
- `vitrine kit status`, `vitrine self-update`.
- `vitrine.json` lock-файл как источник воспроизводимости; сверка кэш↔репо при `add`/`update` (предупреждение о расхождении версий в команде — §7).
- `vitrine doctor` — консистентность `vitrine.json ↔ файлы ↔ пакеты ↔ env`; предлагает освежить дизайн-инструкцию в `CLAUDE.md`.
**DoD:** офлайн-`add` после `kit update`; `doctor` ловит подброшенный рассинхрон (удалённый файл, версия не та, пропавший env) и предлагает фикс.

### M8 — Коммерция: `cart`, `checkout-stripe` → простой магазин · `L` · *роадмап п.8*
**Deliverables:** фичи `cart`, `checkout-stripe` в реестре; реализация `CommerceBackend` на Payload (`PayloadCommerce*`); Stripe Checkout (redirect) + вебхук-обработчик в `@maks417/core` (критлогика!) + создание заказа.
**DoD:** e2e (playwright + Stripe test mode): добавление в корзину → checkout → редирект Stripe → вебхук → заказ в админке. `tier=simple-store` собирается визардом.

### M9 — `update` с 3-way merge + `diff` · `L` · *роадмап п.9*
**Deliverables:** `vitrine update [feature...]` (3-way merge: base=pristine-оригинал из `.vitrine/originals/`, ours=репо клиента, theirs=кэш) + `vitrine diff <feature>` (предпросмотр). Конфликт-маркеры при неразрешимом merge.
**DoD:** клиент со стилизованным (изменённым) компонентом обновляет фичу → правки клиента сохранены, новое из реестра влито, конфликты помечены; `diff` показывает план до применения.

### M10 — Vendure → полный магазин · `XL` · *роадмап п.10* (в основном плане)
> ⚠️ **Параллельный трек:** юр-проверка применимости GPL-3.0 (§3/§15 спеки, **TBD**) стартует независимо и должна закрыться **до** релиза Vendure-tier клиенту. Решение «делаем M10» фиксирует последовательность, но не снимает лицензионный риск.
**Deliverables:** `VendureCatalog*`/`VendureCommerce*` реализации контрактов; `templates/backend-vendure`; Vendure populate + superadmin (§18 эквивалент гард); фичи tier=full (promotions, варианты, мультивалюта, B2B).
**DoD:** тот же эталонный клиент собирается с `backend=vendure`, фичи каталога/корзины переносимы **без изменений** (доказательство переносимости контрактов).

---

## 4. Deep-dive: примитив установки фичи

Псевдокод центрального артефакта (M4). Должен быть **идемпотентным** и **частично-транзакционным**.

```
installFeature(repo, feature, version):
  plan = []                                  # собираем план, ничего не пишем
  # 1. Резолв зависимостей (топосорт)
  deps = resolve(feature.registryDependencies + corePackages + npm)
  for d in deps: installFeature(repo, d)     # рекурсивно, registry-зависимости
  # 2. Файлы (с pristine-снапшотом для будущего update)
  for f in feature.files:
     plan.add(copy(f.from -> repo/f.to))
     plan.add(snapshot(f.from -> .vitrine/originals/<feature>@<version>/f.to))
  # 3. Флаг в site.config (управляемый блок-маркер, не свободный AST)
  plan.add(setConfigFlag(feature.config.set))     # features.reviews = true
  # 4. Слоты (управляемый блок в lib/slots.ts)
  plan.add(registerSlots(feature.slots))
  # 5. Blueprint extend (аддитивно)
  plan.add(extendBlueprint(feature.blueprint))
  # 6. env + npm
  plan.add(mergeEnvExample(feature.env))
  plan.add(addNpmDeps(feature.npm + feature.corePackages))
  # 7. Локфайл + CLAUDE.md
  plan.add(writeLock(vitrine.json, feature, version))
  plan.add(appendClaudeDoc(feature.claudeDoc))

  # Применение транзакционно: бэкап → apply → verify → commit | rollback
  with transaction(repo):                     # снимок затрагиваемых файлов
     applyAll(plan)
     validate(vitrine.json, site.config against schemas)   # ajv/zod
```

**Ключевые инварианты:**
- **Идемпотентность.** Повторный `add` той же версии — no-op. Достигается: маркер-блоки переписываются целиком из декларации, копирование сверяет хэш, флаги — set а не append.
- **Конфликты.** `feature.conflicts` и пересечения слотов проверяются на этапе плана, до записи.
- **Откат.** Любое падение (валидация схемы, конфликт, IO) откатывает к снимку. Полу-применённый репо запрещён.
- **Где кодомод неизбежен** — явные маркеры вставки в сгенерированных файлах (как требует §8), а не эвристический парсинг.

---

## 5. Deep-dive: поверхность контрактов (M1) — что именно фиксируем

Это API, который замораживается под semver. Конкретизация §5:

- **Tokens:** `tokens.ts` — union имён CSS-переменных + Tailwind preset-фабрика. Контракт = *имена*, не значения. Дизайн-шаг трогает значения (§11), фичи ссылаются на имена.
- **Data:** интерфейсы `CatalogSource`/`CommerceBackend` (уже в §5) + нормализованные доменные типы. **Решить заранее:** деньги — целое в минимальных единицах (копейки), как в демо-сиде §18.2 (`price: 199000` = 1990.00). Зафиксировать в типе `Money`.
- **Slots:** замкнутый перечень имён слотов в v1 (расширяется аддитивно). `SlotRegistration { slot, component, order }`.
- **Config:** zod-схема `SiteConfig` — единственный источник, JSON Schema генерится из неё.
- **Blueprint:** `extend(collection, { addFields })` — только аддитивно; запрет на изменение/удаление существующих полей закреплён типом и ревью-гейтом (§3 спеки, §13).

---

## 6. Deep-dive: zero-config dev (M5) — точки внимания

Спека даёт готовый код (§18), реализация прямолинейна, но есть тонкости:
- `canConnect(url)` — реальный ping с таймаутом ~2с и закрытием соединения; различать `ECONNREFUSED`/timeout/auth-error (всё → fallback в dev).
- `seedDemo`/`ensureDevAdmin` оба из `onInit`; гарды `NODE_ENV !== 'production'` **и** `count === 0`. На проде — никогда.
- Placeholder-картинки — **локальные** SVG в `templates/.../seed-assets/`, грузятся в `media` при сиде; сети нет → офлайн работает.
- `.vitrine/` (sqlite + originals) и `.env` — в `.gitignore` шаблона.
- `VITRINE_DB_STRICT=1` отключает fallback даже в dev (ловить опечатки в конфиге).
- Vendure-эквивалент (`populate` + superadmin) — в M10.

---

## 7. Deep-dive: `update` / 3-way merge (M9) и `doctor` (M7)

- **Хранение base.** Pristine-оригинал каждой версии файла → `.vitrine/originals/<feature>@<version>/`. Не полагаемся на кэш (он привязан к одному релизу). Это решение надо заложить **уже в M4** (примитив снапшотит при установке), иначе M9 нечем merge'ить.
- **Merge.** `node-diff3` по трём входам; при чистом merge — тихо, при конфликте — стандартные `<<<<<<<` маркеры + список конфликтных файлов в выводе.
- **`diff`** = тот же merge в dry-run + рендер унифицированного диффа.
- **`doctor`** проверяет 4 оси: `vitrine.json` ↔ реально лежащие файлы ↔ установленные пакеты (`package.json`) ↔ `.env(.example)`. Каждое расхождение — с предлагаемым фиксом.

---

## 8. CI/CD и релизы

- **PR-гейт:** lint + typecheck + unit + валидация всех `feature.json`/`schemas` + интеграционные тесты примитива установки. **Ревью-гейт §3 спеки:** новая фича обязана зависеть только от контрактов (линт-правило/проверка импортов в `registry/*`).
- **Release (Changesets):** merge в main → CI публикует изменённые пакеты в приватный npm (GitHub Packages) **и** прикладывает immutable tarball реестра к GitHub-релизу (тег). `kit update` тянет именно его.
- **Каналы:** `stable` (теги) по умолчанию; `main` (bleeding-edge) под флагом `--channel main`.

---

## 9. Стратегия тестирования

| Уровень | Инструмент | Что покрывает |
|---|---|---|
| Unit | vitest | order pipeline, resolveDbAdapter, merge-логика, резолвер зависимостей |
| Схемы | ajv против сгенерированных JSON Schema | каждый `feature.json`, примеры `vitrine.json`/`site.config` |
| Интеграция CLI | vitest + temp-dirs | `init`/`add`/`update`/`doctor` против реальной ФС, снапшот-сравнение |
| E2E | playwright | эталонный клиент: каталог (M5), корзина→checkout→заказ в Stripe test (M8) |
| Идемпотентность | дифф-прогон | повторный `add`, повторный `design apply` — нулевой дифф |

---

## 10. Зафиксированные параметры (решения стейкхолдеров)

| # | Решение | **Выбор** | Последствие для плана | Из спеки |
|---|---|---|---|---|
| 1 | Приватный реестр пакетов | **GitHub Packages** | `publishConfig.registry` = npm.pkg.github.com; авторизация `gh`/git-creds; kit-релизы и пакеты на одной платформе. **scope** = `@maks417`, репо `github.com/Maks417/vitrine` (приватный, личный аккаунт) | §6 |
| 2 | Рантайм-базис | **Node 20 LTS + pnpm-first** | `engines.node >=20`; preflight (шаг 0 визарда) проверяет Node 20; CI на Node 20; pnpm основной, npm/yarn best-effort | §10 |
| 3 | Первый хостинг-таргет эталона | **VPS + Docker** | M5 генерит `Dockerfile` + `docker-compose.yml` (app + Postgres); пул-коннектор для serverless-Postgres понижен в приоритете; деплой-заметки под VPS | §10, §16 |
| 4 | Полный магазин (Vendure, GPL-3.0) | **Закоммитились в M10 сейчас** | Vendure в основном плане, не за флагом. ⚠️ Юр-проверка GPL-3.0 (§3/§15, **TBD**) запускается **параллельно** как отдельный трек — выбор «делаем» не снимает лицензионный риск, а только фиксирует последовательность | §3, §15 |
| 5 | `vitrine design apply` | **Обёртка над Claude Code** | CLI шеллит в установленный Claude Code с инструкцией из `CLAUDE.md` + `/design`; своя Anthropic-интеграция/ключ не нужны; M6 = тонкий запуск + проверка идемпотентности | §11 |
| 6 | Имена слотов/токенов v1 | **Зафиксировать набор сейчас** | Замкнутый минимальный список слотов и токенов — артефакт M1 (предложу при старте M1), замораживается под semver | §5 |

> **Scope зафиксирован:** `@maks417` (личный аккаунт `github.com/Maks417`, пакеты приватные). `.npmrc` всех репо (kit + клиентских): `@maks417:registry=https://npm.pkg.github.com`.
>
> **Следствие для клиентских репозиториев:** приватные `@maks417/*` пакеты требуют авторизации и **на установке тоже** — каждому клиентскому репо (dev-машина + CI + Docker-build на VPS) нужен GitHub PAT со scope `read:packages`. Заложить в M0/M5: `.npmrc` с `${GITHUB_TOKEN}`, заметка в `.env.example` и в `CLAUDE.md` клиента, и build-arg для Docker. Это единственная «цена» приватного личного scope против публичного.

---

## 11. Сводка последовательности и размеров

| Веха | Роадмап §16 | Размер | Блокирует |
|---|---|---|---|
| M0 Бутстрап | — | S | всё |
| M1 contracts | 1 | L | M2–M10 |
| M2 core + blueprint | 2 | L | M3+ |
| M3 каталожные фичи | 3 | M | M5 |
| M4 CLI: примитив + init/add | 4 | XL | M5+ (и закладывает snapshot для M9) |
| M5 шаблоны + zero-config + эталон | 5 | XL | демо, продажи |
| M6 дизайн-пайплайн | 6 | M | поставка под клиента |
| M7 kit update + doctor | 7 | M | командная работа |
| M8 коммерция (cart+stripe) | 8 | L | простой магазин |
| M9 update + 3-way merge | 9 | L | долгая поддержка репозиториев |
| M10 Vendure | 10 | XL | полный магазин (юр-проверка GPL-3.0 — параллельный трек) |

**Минимальный демонстрируемый срез (первая ценность):** M0→M1→M2→M3→M4→M5 = работающий клиент-каталог, собираемый визардом, поднимаемый одной командой. Это первая точка, где продукт можно показать инвестору/клиенту.
