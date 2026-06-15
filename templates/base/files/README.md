# Клиентский проект Vitrine

Сгенерирован `vitrine init`. Next.js + Tailwind, фичи скопированы из реестра
Vitrine (вы владеете кодом и стилизуете его токенами).

## Локальный запуск (zero-config)

```bash
pnpm install          # требует GITHUB_TOKEN для приватных @maks417/* (см. .npmrc)
cp .env.example .env   # DATABASE_URL можно оставить пустым — будет SQLite-fallback
pnpm dev
```

- Витрина: http://localhost:3000
- Админка: http://localhost:3000/admin

В dev без Postgres приложение поднимает встроенный SQLite (`.vitrine/dev.sqlite`),
заполняет демо-каталог (5 товаров) и заводит dev-админа (логин/пароль печатаются
в консоль один раз). Подробности — `CLAUDE.md` и спецификация §18.

## Дизайн

1. Положите экспорт из Claude Design в `/design`.
2. `vitrine design apply` — ИИ задаёт значения токенов в `theme/client.css`.

## Деплой (VPS + Docker)

```bash
export GITHUB_TOKEN=...   # PAT read:packages для приватных пакетов
export PAYLOAD_SECRET=...  # случайный секрет
docker compose up --build
```

`docker-compose.yml` поднимает app + Postgres. Production-режим требует
`DATABASE_URL` — без него старт прерывается (SQLite-fallback только в dev).
