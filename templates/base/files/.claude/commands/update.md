---
description: Update Vitrine features (kit update → diff → update → doctor)
argument-hint: [feature]
---

Update features from the registry while keeping the client's edits:

1. `vitrine kit update` — refresh the local registry/templates cache from GitHub
   (needs `gh` and `tar`; cache in `~/.vitrine`).
2. `vitrine kit status` — see what's newer than what's installed.
3. `vitrine diff $ARGUMENTS` — preview changes without writing (for each feature being updated).
4. `vitrine update $ARGUMENTS` — 3-way merge (base = your snapshot in `.vitrine/originals/`).
   Without an argument it updates all features.
5. If the merge produced conflicts — open the files with git markers (`<<<<<<<` / `=======` / `>>>>>>>`),
   resolve them by hand, keeping both the client's edit and the new version from the registry.
6. `vitrine doctor` — check consistency. Run `pnpm build` and report the result.
