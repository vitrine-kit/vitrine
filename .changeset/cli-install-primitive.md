---
"@maks417/vitrine": minor
---

M4: примитив установки фичи + команды `init`/`add`/`list`/`remove`. Примитив —
общий для init и add (7 шагов §9: резолв registry-зависимостей → копирование
files → флаг в site.config → слоты → blueprint → env+npm → vitrine.json +
CLAUDE.md). Идемпотентен, транзакционен (откат при ошибке), снапшотит
pristine-оригиналы в `.vitrine/originals` (база для 3-way merge, M9). `init`
создаёт минимальный скелет клиента (полные Next/Payload-шаблоны — M5).
