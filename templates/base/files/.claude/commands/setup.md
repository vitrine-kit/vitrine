---
description: First-time project setup — dependencies, env, start the dev server
---

Bring this Vitrine project up locally. Work step by step, stop on errors:

1. Check Node >= 20 (`node -v`). If lower, ask to upgrade (Node 20 LTS).
2. `pnpm install` (the `@vitrine-kit/*` packages are public on npm — no token needed).
3. If there's no `.env` — `cp .env.example .env`. Go through the keys and suggest what to fill in
   (production requires a real `DATABASE_URL`; dev has a SQLite fallback).
4. Start the dev server; see `README.md` for backend specifics:
   - Payload: `pnpm dev` → storefront `http://localhost:3000`, admin `/admin`.
   - Vendure: `pnpm vendure` (Shop API on :3001, separate terminal) + `pnpm dev` (:3000).
5. Make sure the page opens. Briefly report the status and the next step
   (`/design` for branding or `/add-feature` for features).
