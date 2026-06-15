---
"@maks417/vitrine": minor
---

M5: `init` скаффолдит из шаблонов `templates/base` + `templates/backend-payload`
(Next.js + Tailwind + Payload 3) поверх того же примитива установки. Шаблон даёт
статический каркас (роуты витрины, админка Payload, адаптеры, zero-config dev —
SQLite-fallback + демо-сид + dev-админ §18, Dockerfile + docker-compose под VPS);
CLI генерирует управляемые файлы (site.config, vitrine.json, CLAUDE.md,
package.json со стеком Next/Payload, slots/blueprint/theme). Реальный
`PayloadCatalogSource` поверх контракта `CatalogSource`; чистые мапперы и логика
выбора БД покрыты тестами и `typecheck:templates`.
