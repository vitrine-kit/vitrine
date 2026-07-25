export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  body: string;
  createdAt: string;
}

export function parseReviews(value: unknown): ProductReview[] {
  if (!Array.isArray(value)) return [];
  return value.filter((r): r is ProductReview => {
    if (!r || typeof r !== 'object') return false;
    const o = r as Record<string, unknown>;
    return (
      typeof o.id === 'string' &&
      typeof o.author === 'string' &&
      typeof o.rating === 'number' &&
      typeof o.body === 'string' &&
      typeof o.createdAt === 'string'
    );
  });
}
