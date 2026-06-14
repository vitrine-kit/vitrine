---
"@maks417/core": minor
---

M2: фреймворк-агностичный runtime. Реестр слотов (`createSlotRegistry`,
`registerSlot`, `getSlotMounts`) + React `<Slot>` в подпути `@maks417/core/react`;
реестр адаптеров (`createAdapterRegistry` → активный CatalogSource/CommerceBackend
по site.config); каркас order pipeline (`runPipeline`) и Stripe webhook
(`handleStripeWebhook` с инъектируемой верификацией). Order pipeline/webhook
наполняются в M8.
