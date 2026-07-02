---
"@vitrine-kit/vitrine": patch
---

Review follow-ups. `--project <path>` on add/remove/list/update/diff/doctor/design-apply
to target an explicit client root; `vitrine remove` drops the removed feature's env keys
from `.env.example` (user-added keys stay); doctor gains three checks — orphaned
`.vitrine/originals` snapshots, unpaired managed-region markers, and a `.env` that is not
gitignored; circular `registryDependencies` are reported instead of silently broken;
`design apply` preflights `claude --version` and caps the CLAUDE.md instruction block
embedded in the prompt.
