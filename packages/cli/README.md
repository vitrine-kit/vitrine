# @vitrine-kit/vitrine (CLI)

Инструментарий Vitrine — агентского стартер-кита для интернет-магазинов и каталогов.
Устанавливается глобально:

```bash
npm i -g @vitrine-kit/vitrine
```

## С нуля до запущенного проекта

1. **Создать репозиторий клиента** — визард (или флаги для CI):
   ```bash
   vitrine init my-shop
   # без интерактива:
   vitrine init my-shop --yes --tier simple-store --backend payload --features catalog,product-page,seo,cart
   ```
   Визард спросит уровень (`catalog` / `simple-store` / `full-store`), backend
   (`payload` / `vendure`), набор фич и платёжного провайдера.
2. **Дальше — через ИИ-агента.** В созданном репозитории есть `CLAUDE.md` (операционный
   гайд + справочник команд), `AGENTS.md` (для кросс-тул агентов) и слэш-команды Claude Code
   в `.claude/commands/`. Откройте проект в Claude Code и запустите `/setup` — агент поставит
   зависимости, заполнит `.env` и поднимет dev-сервер. Затем `/add-feature`, `/design`,
   `/update`, `/doctor`.

## Команды

В репозитории клиента: `init` (визард), `add`, `remove`, `update`, `diff`, `list`, `doctor`,
`design apply`. Инфраструктура: `kit update` / `kit status` / `self-update`. Полный справочник
с флагами — в `CLAUDE.md` созданного проекта.

Ядро — **примитив установки фичи**, общий для `init` и `add` (гарантия: «добавлено визардом»
≡ «добавлено позже»). `add`/`update` работают офлайн из кэша `~/.vitrine`; сеть нужна только
`kit update`.
