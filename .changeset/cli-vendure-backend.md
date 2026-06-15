---
"@maks417/vitrine": minor
---

M10: backend Vendure → полный магазин. `vitrine init --tier full-store` (backend
по умолчанию vendure) собирает шаблон `templates/backend-vendure`: Vendure-сервер
(`vendure-config.ts` — Postgres / SQLite-dev §18-эквивалент, суперадмин из env),
адаптеры `VendureCatalogSource`/`VendureCommerceBackend` поверх Shop GraphQL,
populate-гард (только dev + пустая БД), Docker (db + server + web). Витрина
(`app/(frontend)`) и фичи каталога/корзины — те же, что на Payload: доказательство
переносимости контрактов (на vendure `checkout-stripe` исключается из автонабора —
оплата нативная Vendure-Stripe). Чистые мапперы Vendure→контракт покрыты тестами и
`typecheck:templates`. ⚠ Юр-проверка лицензии Vendure (GPL-3.0) — отдельный трек.
