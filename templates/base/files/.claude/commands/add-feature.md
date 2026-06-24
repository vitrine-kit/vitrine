---
description: Add a feature from the Vitrine registry and style it
argument-hint: <feature>
---

Add the `$ARGUMENTS` feature to the project:

1. `vitrine list` — check that the feature is available and not yet installed (show the list).
2. `vitrine add $ARGUMENTS` — copies files, registers slots/blueprint, merges in
   env and dependencies, updates `site.config.ts`, `vitrine.json`, and the table in `CLAUDE.md`.
   The feature's dependencies are pulled in automatically.
3. If the feature added keys to `.env.example` — suggest filling them in `.env`.
4. `vitrine design apply` — style the new feature for the current brand (only if `/design`
   has an export; otherwise skip).
5. `pnpm typecheck` (or `pnpm build`) — make sure the build is green.
6. Don't edit generated files by hand. Remind the user to commit the changes.

To remove a feature — `vitrine remove <feature>` (only for `removable` ones).
