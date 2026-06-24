# @vitrine-kit/vitrine (CLI)

The Vitrine toolkit — an agentic starter kit for e-commerce stores and catalogs.
Install it globally:

```bash
npm i -g @vitrine-kit/vitrine
```

## From zero to a running project

1. **Create the client repository** — wizard (or flags for CI):
   ```bash
   vitrine init my-shop
   # non-interactive:
   vitrine init my-shop --yes --tier simple-store --backend payload --features catalog,product-page,seo,cart
   ```
   The wizard asks for the tier (`catalog` / `simple-store` / `full-store`), backend
   (`payload` / `vendure`), the feature set, and the payment provider.
2. **Then drive it with an AI agent.** The generated repo includes `CLAUDE.md` (operational
   guide + command reference), `AGENTS.md` (for cross-tool agents), and Claude Code slash commands
   in `.claude/commands/`. Open the project in Claude Code and run `/setup` — the agent installs
   dependencies, fills in `.env`, and starts the dev server. Then `/add-feature`, `/design`,
   `/update`, `/doctor`.

## Commands

In the client repository: `init` (wizard), `add`, `remove`, `update`, `diff`, `list`, `doctor`,
`design apply`. Infrastructure: `kit update` / `kit status` / `self-update`. The full reference
with flags is in the generated project's `CLAUDE.md`.

At its core is the **feature install primitive**, shared by `init` and `add` (guarantee: "added by
the wizard" ≡ "added later"). `add`/`update` work offline from the `~/.vitrine` cache; the network
is only needed for `kit update`.
