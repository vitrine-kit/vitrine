# templates/ — скелеты клиентского репозитория

Из них `vitrine init` собирает репозиторий клиента (§6 спеки). `templates/<name>/files`
**зеркалит корень клиента** (как `registry/<feature>/files`): статический каркас
копируется как есть, поверх него CLI генерирует управляемые файлы (site.config.ts,
vitrine.json, CLAUDE.md, package.json, lib/slots.ts, lib/blueprint.ts, theme/client.css).

- `base` — ✅ M5. Next.js (App Router, route group `(frontend)`) + Tailwind (пресет
  Vitrine), роуты витрины (главная/каталог, товар, категория), шапка/подвал с хостингом
  слотов, `.gitignore` (с `.vitrine/`), `.npmrc` (scope `@maks417`), `/design` README.
- `backend-payload` — ✅ M5. Payload-конфиг, админка `(payload)`, адаптер
  `PayloadCatalogSource` поверх контракта `CatalogSource`, zero-config dev
  (SQLite-fallback + демо-сид + dev-админ, §18), `Dockerfile` + `docker-compose.yml`
  (app + Postgres, хостинг-таргет VPS).
- `backend-vendure` — ✅ M10. Vendure-сервер (`vendure-config.ts`, db Postgres/SQLite-dev,
  суперадмин из env), адаптеры `VendureCatalogSource`/`VendureCommerceBackend` поверх Shop
  GraphQL, populate-гард (§18-эквивалент), `Dockerfile` + `docker-compose.yml` (db + server + web).
  Витрина (`app/(frontend)`) и фичи каталога/корзины — те же, что на Payload (переносимость
  через контракты). Полная оплата — Stripe-плагин Vendure; юр-проверка GPL-3.0 — отдельный трек.

## Что проверяется в монорепо

Файлы шаблона, зависящие от Next/Payload, типизируются **при инстанцировании**
клиента (там стек установлен). Чистая критическая логика (мапперы Payload→контракт,
таблица выбора БД §18.1, инварианты демо-сида, гарды dev-процедур) зависит только
от контрактов и покрыта `pnpm typecheck:templates` + тестами в `sandbox/`.
