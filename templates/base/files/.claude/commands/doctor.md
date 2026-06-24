---
description: Check project consistency and fix discrepancies
---

Check the project's health:

1. `vitrine doctor` — reconciles `vitrine.json` ↔ files ↔ packages (`package.json`) ↔ env (`.env.example`).
2. Work through the output. Each issue has a suggested fix:
   - missing file/slot/provider/dependency → `vitrine add <feature>` (reinstalls and regenerates);
   - version in the repo ≠ registry → `vitrine update <feature>`;
   - feature not found in the registry → `vitrine kit update`;
   - missing env key → add it to `.env.example`/`.env`;
   - no design-instruction block in `CLAUDE.md` → refresh it (`kit update` brings it).
3. Apply the fixes (prefer CLI commands over hand edits), then re-run `vitrine doctor`
   until it's green. Report anything left that needs a user decision (e.g. secrets).
