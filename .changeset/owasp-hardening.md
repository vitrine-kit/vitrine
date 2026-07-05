---
"@vitrine-kit/core": minor
"@vitrine-kit/payload-blueprint": patch
---

Security hardening from an OWASP-style review of generated stores:

- `@vitrine-kit/core`: new `checkRateLimit`/`clientIpFromHeaders` helpers (`security/rate-limit.js`) —
  a minimal in-memory per-key rate limiter for cart/checkout/webhook routes and admin APIs.
- `@vitrine-kit/payload-blueprint`: `categories`/`media`/`products`/`variants` now default to
  public-read/admin-write access instead of Payload's implicit public read+write; `users` is
  admin-only; `users.auth` sets `maxLoginAttempts`/`lockTime` for built-in login lockout.
