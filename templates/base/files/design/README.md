# /design — export from Claude Design

Drop your design export here (React/HTML/CSS, tokens, screenshots) and run
`vitrine design apply`. The AI step reads this folder and the instruction from `CLAUDE.md`,
then sets **only the token values** in `theme/client.css` (palette, typography, spacing, radii,
shadows).

This folder is isolated from behavior: its contents don't affect logic, data, routing, or a11y —
only the look, via tokens. Re-running the design step is safe.
