---
"@maks417/payload-blueprint": minor
---

M2: базовые коллекции (products, variants, categories, media, users, orders) +
реализация контракта Blueprint — `createBlueprint().extend()` аддитивно добавляет
поля, `build()` собирает финальные коллекции и бросает при перетирании
существующего поля. Привязка к Payload buildConfig — в шаблоне backend-payload (M5).
