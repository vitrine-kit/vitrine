# Feature: seo

Page metadata and schema.org JSON-LD from domain types, plus sitewide crawl files.

## Modules
- `lib/seo/metadata` — `buildProductMetadata(product)` → `SiteMetadata` (structurally compatible with Next `Metadata`; in the client it's returned from `generateMetadata`).
- `lib/seo/jsonld` — `productJsonLd(product)` → a schema.org `Product`/`Offer` object.
- `components/seo/JsonLd` — `<JsonLd data={…} />` embeds a `<script type="application/ld+json">`.
- `app/sitemap.ts` — dynamic sitemap from `CatalogSource` (home, categories, products).
- `app/robots.ts` — robots.txt pointing at the sitemap; disallows admin/api/cart/order.

## Contracts
Only `@vitrine-kit/contracts` (the `Product` type). Registers no slots.

## Note
The price in JSON-LD is converted from minor units (`price/100`).
Home and category pages set `generateMetadata` in the base template.
