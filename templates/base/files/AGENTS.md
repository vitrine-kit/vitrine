# AGENTS.md

Этот проект — витрина на **Vitrine** (агентский стартер-кит). Канонический гайд для
ИИ-агента и полный справочник команд CLI — в [`CLAUDE.md`](./CLAUDE.md). Прочитай его
перед работой.

Коротко:

- Все операции со стартер-китом — через CLI `vitrine` (`add` / `remove` / `list` /
  `update` / `diff` / `doctor` / `kit update` / `design apply`), а не ручной правкой.
  Полная таблица команд — в `CLAUDE.md`.
- **Не редактируй генерируемые/управляемые файлы** (`lib/slots.ts`, `lib/payments.ts`,
  `lib/blueprint.ts`, управляемые регионы `site.config.ts`, `vitrine.json`, таблицу фич в
  `CLAUDE.md`, `.env*`) — CLI перезатрёт их из состояния.
- **Дизайн — только значения токенов** в `theme/client.css` (через `vitrine design apply`):
  логику/данные/роутинг/структуру компонентов не трогать.
- **Коммиты делает пользователь** — не коммить без явной просьбы.

Готовые потоки для Claude Code — слэш-команды в [`.claude/commands/`](./.claude/commands)
(`/setup`, `/add-feature`, `/design`, `/update`, `/doctor`).
