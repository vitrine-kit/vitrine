---
"@vitrine-kit/vitrine": patch
---

Hardening from the project review. CLI: fail-fast pre-validation in the install primitive
(incl. in-batch conflicts) so common failures never touch the tree; feature-name and
manifest-path validation against traversal; LF normalization for managed writes and
EOL-insensitive 3-way merges (+ `.gitattributes` in the base template); validate-then-swap
kit cache updates with temp-dir cleanup and a warn-only version cross-check; in-memory lock
restore on a failed `update`; `POSTGRES_PASSWORD` documented in the generated
`.env.example`. Registry fixes riding this release: payment providers fail fast on missing
required env (call-time, `next build` still needs no secrets), the Paddle webhook resolves
the customer email via `customers.get`, the YooKassa webhook acks forged payment ids
instead of retrying forever, and `CheckoutButton` surfaces checkout errors inline
(provider lib files are excluded from monorepo typecheck — review-verified).
