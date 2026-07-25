# Feature: reviews

Customer reviews stored as a JSON array on the product document (`reviews` field via blueprint).

## Modules
- `ReviewList` — renders existing reviews + form (`product.below-description`)
- `POST /api/reviews` — appends a review (rate-limited)
- `lib/reviews/blueprint.ts` — additive `reviews` json field on products

## Note
Moderation is not included — submissions are public immediately. Tighten access before production.
