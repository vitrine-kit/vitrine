# Feature: accounts

Customer accounts (Payload `customers` auth collection) plus guest order lookup by email.

## Modules
- `customers` collection — added via blueprint `addCollection` (email/password auth)
- `orders.customer` — optional relationship field (set on webhook fulfill when email matches)
- `/account` — signed-in dashboard or sign-in / register / guest lookup
- `/account/login`, `/account/register`
- `/account/forgot-password`, `/account/reset-password?token=`
- `/account/orders` — orders for the session email or `?email=` guest query
- `AccountLink` — header link

## Auth
Uses Payload's built-in REST: `POST /api/customers`, `/login`, `/logout`,
`/forgot-password`, `/reset-password`. Session cookies are managed by Payload.
Forgot-password emails go through the Payload email adapter (`email` feature / console).

## Guest lookup
Still available without an account — enter the checkout email on `/account`.
