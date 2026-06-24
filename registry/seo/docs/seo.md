# Feature: seo

Page metadata and schema.org JSON-LD from domain types.

## Modules
- `lib/seo/metadata` — `buildProductMetadata(product)` → `SiteMetadata` (structurally compatible with Next `Metadata`; in the client it's returned from `generateMetadata`).
- `lib/seo/jsonld` — `productJsonLd(product)` → a schema.org `Product`/`Offer` object.
- `components/seo/JsonLd` — `<JsonLd data={…} />` embeds a `<script type="application/ld+json">`.

## Contracts
Only `@vitrine-kit/contracts` (the `Product` type). Registers no slots.

## Note
The price in JSON-LD is converted from minor units (`price/100`).
