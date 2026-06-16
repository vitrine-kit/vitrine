---
"@maks417/vitrine": patch
---

init генерирует `README.md` клиента (backend-aware) вместо статичного файла шаблона.
README покрывает весь рабочий поток разработчика — запуск/деплой под выбранный backend
(Payload: `/admin` + `PAYLOAD_SECRET`; Vendure: `pnpm vendure` + Shop API `:3001` +
`VENDURE_*`), а также жизненный цикл фич и обновлений (`add`/`remove`/`list`,
`update`/`diff`, `doctor`, `kit update`) и независимый апгрейд пакетов `@maks417/*`.
Исправляет баг: прежний статичный README был Payload-специфичен и попадал в Vendure-проект.
