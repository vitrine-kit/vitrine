# Feature: email

Wires Payload's email transport for order confirmations and auth mail.

## Modules
- `lib/email/adapter.ts` — `resolveEmailAdapter()` builds `@payloadcms/email-nodemailer`
  from `SMTP_*` / `EMAIL_FROM`, or a **console adapter** when `EMAIL_FROM` is set without
  `SMTP_HOST` (reset links and order mail print to the terminal / `docker compose logs`)
- `payload.config` (template) awaits the adapter when the file is present
- Checkout `notifyOrderConfirmation` calls `payload.sendEmail` when an adapter is configured

## Setup
1. `vitrine add email` (installs `@payloadcms/email-nodemailer` + `nodemailer`)
2. Set `EMAIL_FROM` (required for any adapter). Optionally `SMTP_HOST` / `SMTP_PORT` /
   `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM_NAME` for real delivery
3. `integrations.email` is set to `"smtp"` by the feature config

Without `SMTP_HOST`, zero-config still works — messages (including password-reset links)
are logged to the console via the console adapter.
