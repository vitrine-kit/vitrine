---
description: Обновить фичи Vitrine (kit update → diff → update → doctor)
argument-hint: [feature]
---

Обнови фичи из реестра, сохранив правки клиента:

1. `vitrine kit update` — обнови локальный кэш реестра/шаблонов с GitHub
   (нужны `gh` и `tar`; кэш в `~/.vitrine`).
2. `vitrine kit status` — посмотри, что новее установленного.
3. `vitrine diff $ARGUMENTS` — предпросмотр изменений без записи (для каждой обновляемой фичи).
4. `vitrine update $ARGUMENTS` — 3-way merge (база = твой снапшот в `.vitrine/originals/`).
   Без аргумента обновляет все фичи.
5. Если merge дал конфликты — открой файлы с git-маркерами (`<<<<<<<` / `=======` / `>>>>>>>`),
   разреши их вручную, сохраняя и правку клиента, и новое из реестра.
6. `vitrine doctor` — проверь консистентность. Прогони `pnpm build` и доложи результат.
