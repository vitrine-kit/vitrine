# schemas/ — JSON Schema

Machine-readable schemas for validating output (including the AI agent's, spec §13): `feature.json`, `vitrine.json`, `site.config`, `registry-index`.

**The source of truth is zod** in `@vitrine-kit/contracts`; these `.json` files are **generated** from zod (`pnpm schemas`) so that runtime validation and JSON Schema never drift apart. Do not edit by hand.
