# Фича: seo

Метаданные страниц и schema.org JSON-LD из доменных типов.

## Модули
- `lib/seo/metadata` — `buildProductMetadata(product)` → `SiteMetadata` (структурно совместима с Next `Metadata`; в клиенте возвращается из `generateMetadata`).
- `lib/seo/jsonld` — `productJsonLd(product)` → объект schema.org `Product`/`Offer`.
- `components/seo/JsonLd` — `<JsonLd data={…} />` встраивает `<script type="application/ld+json">`.

## Контракты
Только `@vitrine-kit/contracts` (типы `Product`). Слотов не регистрирует.

## Заметка
Цена в JSON-LD приводится из минимальных единиц (`price/100`).
