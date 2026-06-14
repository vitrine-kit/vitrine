---
"@maks417/contracts": major
---

M1: первая стабильная версия контрактов (1.0.0). Пять контрактов — Tokens, Data
(CatalogSource/CommerceBackend + нормализованные типы), Slots (замкнутый набор из
32 слотов), Config (site.config), Blueprint (аддитивный extend). Zod-схемы
манифестов (feature.json, vitrine.json, registry _index.json) и генерация
JSON Schema в schemas/ из единого источника (zod). Расширять только аддитивно.
