# templates/ — скелеты клиентского репозитория

Из них `vitrine init` собирает репозиторий клиента (§6 спеки):

- `base` — Next.js + Tailwind каркас, `site.config.ts`, `CLAUDE.md`, нейтральная `theme/<client>.css`, `.env.example`, `.gitignore` (с `.vitrine/`), `.npmrc` (scope `@maks417`).
- `backend-payload` — Payload-конфиг, `lib/adapter/*`, zero-config dev (SQLite-fallback + демо-сид + dev-админ, §18), `Dockerfile` + `docker-compose.yml` (app + Postgres, хостинг-таргет VPS).
- `backend-vendure` — аналог под Vendure (M10).

Наполняются в M5 (`base` + `backend-payload`) и M10 (`backend-vendure`).
