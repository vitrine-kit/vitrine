# Changesets

Версии пакетов и релизы Vitrine управляются [Changesets](https://github.com/changesets/changesets).

- `pnpm changeset` — описать изменение (какие пакеты, тип bump).
- `pnpm version-packages` — применить changeset'ы, поднять версии, собрать CHANGELOG.
- `pnpm release` — собрать и опубликовать в npm (npmjs.com; CI на merge в `main`).

**Контракты:** `@vitrine-kit/contracts` меняем только аддитивно (см. §5 спеки). Ломающее изменение контракта = major bump и осознанное решение.
