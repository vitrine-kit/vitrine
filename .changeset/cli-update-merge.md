---
"@maks417/vitrine": minor
---

M9: `vitrine update [feature…]` (3-way merge) + `vitrine diff <feature>`. Построчный
diff3 (`merge.ts`, без зависимостей): base = pristine-оригинал версии
(`.vitrine/originals`, закладывается примитивом с M4), ours = репо клиента
(стилизованный), theirs = версия из реестра. Чистый merge тихий, неразрешимый —
git-маркеры (`<<<<<<< / ======= / >>>>>>>`). `applyUpdate` пишет слитые файлы,
обновляет pristine-снапшот до новой версии, бампает `vitrine.json` и регенерирует
производные. `diff` = тот же план в dry-run. `update` без аргументов обходит все
установленные фичи; `--dry-run` показывает план без записи.
