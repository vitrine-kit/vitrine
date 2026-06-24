---
"@vitrine-kit/contracts": minor
"@vitrine-kit/vitrine": patch
"@vitrine-kit/core": patch
"@vitrine-kit/payload-blueprint": patch
---

English-only product: all user-facing text is now English. The CLI's output and the
artifacts it generates into the client repo (`README.md`, `CLAUDE.md`, `.env.example`,
`.claude/commands/*`, `AGENTS.md`) are in English, as are runtime error messages across
`@vitrine-kit/core` and `@vitrine-kit/payload-blueprint`, and the demo seed (English
products/categories). The default `site.config` i18n is now `defaultLocale: 'en'`,
`locales: ['en']`, `currency: 'USD'` (previously `ru`/`['ru']`/`'RUB'`) — explicit values
in an existing client's `site.config` are unaffected.
