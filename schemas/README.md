# schemas/ — JSON Schema

Машиночитаемые схемы для валидации вывода (в т.ч. ИИ-агента, §13 спеки): `feature.json`, `vitrine.json`, `site.config`, `registry-index`.

**Источник истины — zod** в `@vitrine-kit/contracts`; эти `.json` **генерируются** из zod (`pnpm schemas`) — чтобы runtime-валидация и JSON Schema не расходились. Не редактировать вручную.

Генерация подключается в M1.
