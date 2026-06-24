# AGENTS.md

This project is a storefront built on **Vitrine** (an agentic starter kit). The canonical guide for
the AI agent and the full CLI command reference live in [`CLAUDE.md`](./CLAUDE.md). Read it
before working.

In short:

- All starter-kit operations go through the `vitrine` CLI (`add` / `remove` / `list` /
  `update` / `diff` / `doctor` / `kit update` / `design apply`), not manual edits.
  The full command table is in `CLAUDE.md`.
- **Don't edit generated/managed files** (`lib/slots.ts`, `lib/payments.ts`,
  `lib/blueprint.ts`, the managed regions of `site.config.ts`, `vitrine.json`, the feature table in
  `CLAUDE.md`, `.env*`) — the CLI overwrites them from state.
- **Design = token values only** in `theme/client.css` (via `vitrine design apply`):
  don't touch logic/data/routing/component structure.
- **The user makes commits** — don't commit without an explicit request.

Ready-made flows for Claude Code are the slash commands in [`.claude/commands/`](./.claude/commands)
(`/setup`, `/add-feature`, `/design`, `/update`, `/doctor`).
