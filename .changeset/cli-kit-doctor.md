---
"@maks417/vitrine": minor
---

M7: `vitrine kit update` / `kit status` / `self-update` + `vitrine doctor`.
`kit update` заполняет кэш `~/.vitrine` (registry + templates) с GitHub-релиза
(через `gh`) или из локального дерева (`--from <dir>`, офлайн); печатает changelog
(дифф наборов фич) и пишет `kit.json`. После update `init`/`add` работают офлайн
из кэша (`VITRINE_HOME`/`~/.vitrine` резолвится автоматически). `doctor` сверяет
четыре оси консистентности репозитория клиента — `vitrine.json` ↔ файлы ↔ пакеты
(`package.json`) ↔ env (`.env.example`) + слоты/флаги/дизайн-инструкцию — и на
каждое расхождение предлагает фикс (выход с кодом 1 при error-уровне).
