---
description: Apply the design from /design to the tokens (vitrine design apply)
---

Apply the client design:

1. Check that the `/design` folder has a brand export (something besides `README.md`: tokens,
   screenshots, assets). If it's empty — ask the user to add the export and stop.
2. `vitrine design apply` — a wrapper over Claude Code: it sets ONLY the CSS variable values
   in `theme/client.css`, without touching logic/data/routing/structure. The token set is closed.
3. Show the `theme/client.css` diff and briefly describe the palette/typography/spacing changes.
4. The step is idempotent — re-running converges. Run it again if needed.

If Claude Code isn't found in PATH — point to it via `--bin` or `VITRINE_CLAUDE_BIN`.
