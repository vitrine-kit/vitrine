# Vitrine

Внутренний инструментарий агентства для быстрой сборки клиентских интернет-магазинов и каталогов. Реестр фич в стиле shadcn/ui (copy-in), но для **целых фич магазина**, за пятью стабильными контрактами. 1 клиент = 1 репозиторий; уникальный дизайн применяется ИИ-шагом.

📄 Спецификация: `vitrine-starter-kit-spec.md` · План реализации: [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)

## Структура монорепо

```
packages/
  contracts/         @maks417/contracts — пять контрактов (Tokens, Data, Slots, Config, Blueprint)
  core/              @maks417/core — runtime слотов/адаптера, order pipeline, Stripe webhook
  payload-blueprint/ @maks417/payload-blueprint — базовые коллекции + extend()
  cli/               @maks417/vitrine — CLI (примитив установки, init, add, update, doctor)
registry/            copy-in реестр фич (catalog, product-page, seo, cart, checkout-stripe)
templates/           скелеты клиентского репо: base, backend-payload, backend-vendure
sandbox/             площадка core-разработки (фичи на одних контрактах)
schemas/             JSON Schema (генерируются из zod в contracts)
```

## Зафиксированные параметры

| | |
|---|---|
| Реестр пакетов | **GitHub Packages** (приватный), scope `@maks417` |
| Рантайм | **Node 20 LTS + pnpm** |
| Стек шаблона | Next.js + Tailwind + Payload 3 |
| Хостинг эталона | **VPS + Docker** (app + Postgres) |
| Версионирование | Changesets · Turborepo |

## Разработка

```bash
pnpm install
pnpm build       # turbo: сборка всех пакетов
pnpm typecheck
pnpm test
pnpm changeset   # описать изменение версии
```

> Установка приватных `@maks417/*` пакетов требует GitHub PAT со scope `read:packages` в окружении (`GITHUB_TOKEN`), см. `.npmrc`.

## Релиз / публикация

Версии — через [Changesets](.changeset). Поток на push в `main`
([.github/workflows/release.yml](.github/workflows/release.yml)):

1. Есть неучтённые changesets → бот открывает PR **«Version Packages»** (бамп версий + CHANGELOG).
2. PR влит → CI публикует изменённые `@maks417/*` в GitHub Packages, ставит git-теги и
   создаёт GitHub Releases. Source-архив релиза тянет `vitrine kit update`.

```bash
pnpm changeset          # описать изменение (локально)
# дальше — автоматикой CI; вручную: pnpm version-packages && pnpm release
```

## Дорожная карта

См. [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — фазы **M0…M10**. Текущий статус:
**M0–M10 реализованы**; офлайн-проверка (build/typecheck/тесты/схемы) зелёная. Живые прогоны
стека (Next/Payload/Vendure/Stripe, e2e) и публикация пакетов — на CI / машине со стеком;
юр-проверка лицензии Vendure (GPL-3.0) — отдельный параллельный трек.
