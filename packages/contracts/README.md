# @vitrine-kit/contracts

The five stable Vitrine contracts that every registry feature depends on: **Tokens · Data · Slots · Config · Blueprint**.

This is a semver-governed API. A broken contract breaks `add` for every client → we extend it **additively only** (spec §5, §13).

Source of truth is **zod**; the JSON Schemas in `schemas/` are generated from it. The v1 slot/token naming proposal lives in [docs/contracts-v1-proposal.md](../../docs/contracts-v1-proposal.md).
