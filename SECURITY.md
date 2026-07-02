# Security Policy

Vitrine ships payment-touching code (checkout features, webhook handlers) and a CLI that
writes into client repositories — security reports are taken seriously.

## Reporting a vulnerability

Please do **not** open a public issue for security problems. Use GitHub's private
vulnerability reporting on this repository instead:
<https://github.com/vitrine-kit/vitrine/security/advisories/new>

Include a minimal reproduction and the affected surface: an `@vitrine-kit/*` npm package,
a copy-in registry feature, or a template. You will get an acknowledgement within a few
days.

## Supported versions

The latest published version of each `@vitrine-kit/*` package. Copy-in registry features
are fixed per client repository — clients pick up fixes via `vitrine update` after a new
kit release.

## In scope, notably

- Webhook verification (Stripe/Paddle signatures, YooKassa API re-confirmation) and the
  order pipeline in `@vitrine-kit/core`.
- CLI file operations in client repositories (`vitrine init/add/update/remove`) — path
  traversal, cache poisoning (`~/.vitrine`), generated-code injection.
