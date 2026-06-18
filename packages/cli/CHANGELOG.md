# @maks417/vitrine

## 0.2.0

### Minor Changes

- 29f419a: init теперь скаффолдит агентские артефакты в репозиторий клиента, чтобы вести проект через
  ИИ-агента: расширенный `CLAUDE.md` (полный справочник команд CLI + типовые сценарии + границы),
  слэш-команды Claude Code в `.claude/commands/` (`/setup`, `/add-feature`, `/design`, `/update`,
  `/doctor`) и `AGENTS.md` для кросс-тул агентов. README CLI расширен до getting-started.

## 0.1.2

### Patch Changes

- 9cf0098: init генерирует `README.md` клиента (backend-aware) вместо статичного файла шаблона.
  README покрывает весь рабочий поток разработчика — запуск/деплой под выбранный backend
  (Payload: `/admin` + `PAYLOAD_SECRET`; Vendure: `pnpm vendure` + Shop API `:3001` +
  `VENDURE_*`), а также жизненный цикл фич и обновлений (`add`/`remove`/`list`,
  `update`/`diff`, `doctor`, `kit update`) и независимый апгрейд пакетов `@maks417/*`.
  Исправляет баг: прежний статичный README был Payload-специфичен и попадал в Vendure-проект.

## 0.1.1

### Patch Changes

- b7b4590: CLI: `vitrine --version` теперь читает версию из package.json в рантайме вместо захардкоженного `0.0.0` (расходился с релизной версией пакета).

## 0.1.0

### Minor Changes

- fc9cb9b: M6: `vitrine design apply` — ИИ-шаг дизайна как **обёртка над Claude Code** (§11).
  CLI не имеет своей Anthropic-интеграции: находит бинарь `claude` (--bin /
  VITRINE_CLAUDE_BIN / PATH; внятная ошибка с подсказкой установки, если не найден),
  собирает промпт из блока «ИНСТРУКЦИЯ: применить дизайн из /design» в CLAUDE.md +
  замкнутого набора токенов + указания на единственный редактируемый файл
  `theme/client.css`, и шеллит в Claude Code (`-p`, `--permission-mode acceptEdits`)
  с cwd проекта. Гарды: пустой `design/` → понятная ошибка; `--dry-run` показывает
  команду без запуска. Жёсткие ограничения §11 (только токены, не поведение/данные/
  роутинг/a11y) живут в промпте; шаг идемпотентен.
- 65062d9: M4: примитив установки фичи + команды `init`/`add`/`list`/`remove`. Примитив —
  общий для init и add (7 шагов §9: резолв registry-зависимостей → копирование
  files → флаг в site.config → слоты → blueprint → env+npm → vitrine.json +
  CLAUDE.md). Идемпотентен, транзакционен (откат при ошибке), снапшотит
  pristine-оригиналы в `.vitrine/originals` (база для 3-way merge, M9). `init`
  создаёт минимальный скелет клиента (полные Next/Payload-шаблоны — M5).
- fc9cb9b: M7: `vitrine kit update` / `kit status` / `self-update` + `vitrine doctor`.
  `kit update` заполняет кэш `~/.vitrine` (registry + templates) с GitHub-релиза
  (через `gh`) или из локального дерева (`--from <dir>`, офлайн); печатает changelog
  (дифф наборов фич) и пишет `kit.json`. После update `init`/`add` работают офлайн
  из кэша (`VITRINE_HOME`/`~/.vitrine` резолвится автоматически). `doctor` сверяет
  четыре оси консистентности репозитория клиента — `vitrine.json` ↔ файлы ↔ пакеты
  (`package.json`) ↔ env (`.env.example`) + слоты/флаги/дизайн-инструкцию — и на
  каждое расхождение предлагает фикс (выход с кодом 1 при error-уровне).
- fc9cb9b: M5: `init` скаффолдит из шаблонов `templates/base` + `templates/backend-payload`
  (Next.js + Tailwind + Payload 3) поверх того же примитива установки. Шаблон даёт
  статический каркас (роуты витрины, админка Payload, адаптеры, zero-config dev —
  SQLite-fallback + демо-сид + dev-админ §18, Dockerfile + docker-compose под VPS);
  CLI генерирует управляемые файлы (site.config, vitrine.json, CLAUDE.md,
  package.json со стеком Next/Payload, slots/blueprint/theme). Реальный
  `PayloadCatalogSource` поверх контракта `CatalogSource`; чистые мапперы и логика
  выбора БД покрыты тестами и `typecheck:templates`.
- fc9cb9b: M9: `vitrine update [feature…]` (3-way merge) + `vitrine diff <feature>`. Построчный
  diff3 (`merge.ts`, без зависимостей): base = pristine-оригинал версии
  (`.vitrine/originals`, закладывается примитивом с M4), ours = репо клиента
  (стилизованный), theirs = версия из реестра. Чистый merge тихий, неразрешимый —
  git-маркеры (`<<<<<<< / ======= / >>>>>>>`). `applyUpdate` пишет слитые файлы,
  обновляет pristine-снапшот до новой версии, бампает `vitrine.json` и регенерирует
  производные. `diff` = тот же план в dry-run. `update` без аргументов обходит все
  установленные фичи; `--dry-run` показывает план без записи.
- fc9cb9b: M10: backend Vendure → полный магазин. `vitrine init --tier full-store` (backend
  по умолчанию vendure) собирает шаблон `templates/backend-vendure`: Vendure-сервер
  (`vendure-config.ts` — Postgres / SQLite-dev §18-эквивалент, суперадмин из env),
  адаптеры `VendureCatalogSource`/`VendureCommerceBackend` поверх Shop GraphQL,
  populate-гард (только dev + пустая БД), Docker (db + server + web). Витрина
  (`app/(frontend)`) и фичи каталога/корзины — те же, что на Payload: доказательство
  переносимости контрактов (на vendure `checkout-stripe` исключается из автонабора —
  оплата нативная Vendure-Stripe). Чистые мапперы Vendure→контракт покрыты тестами и
  `typecheck:templates`. ⚠ Юр-проверка лицензии Vendure (GPL-3.0) — отдельный трек.
- d340824: Провайдер-агностичные платежи. `@maks417/core` получает абстракцию `PaymentProvider`

  - реестр `payments` (зеркало adapter/resolver) и нейтральный `handlePaymentWebhook`;
    Stripe-специфичные `handleStripeWebhook`/`cartToStripeLineItems` удалены из ядра
    (переезжают в фичу `checkout-stripe`). `OrderCreationGuard` обобщён:
    `sessionId`→`providerRef`, `existingOrderSessionIds`→`existingOrderRefs`.

  `@maks417/contracts`: `integrations.payments` → `stripe | paddle | yookassa`;
  у манифеста фичи появился блок `payment: { provider }`.

  `@maks417/payload-blueprint`: поля `orders.stripeSessionId`/`carts.stripeSessionId`
  переименованы в `paymentRef`, у `orders` добавлен `paymentProvider`.

  `@maks417/vitrine` (CLI): генерирует `lib/payments.ts` (регистрация провайдеров) и
  проставляет активный провайдер в `site.config` при установке фичи `checkout-<provider>`.

### Patch Changes

- Updated dependencies [65062d9]
- Updated dependencies [d340824]
  - @maks417/contracts@1.0.0
