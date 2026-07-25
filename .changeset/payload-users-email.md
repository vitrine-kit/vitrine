---
"@vitrine-kit/payload-blueprint": patch
---

Stop redeclaring `email` on the auth `users` collection. Payload already provides auth email/password; a second required `email` text field caused `ensureDevAdmin` to fail with "Email is required" and aborted the first storefront request.
