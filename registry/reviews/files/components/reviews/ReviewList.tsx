'use client';
import { useMemo, useState, type FormEvent } from 'react';
import type { Product } from '@vitrine-kit/contracts';
import { parseReviews, type ProductReview } from '../../lib/reviews/types.js';

export interface ReviewListProps {
  product?: Product;
}

export function ReviewList({ product }: ReviewListProps) {
  const initial = useMemo(
    () => parseReviews(product?.extensions?.reviews),
    [product?.extensions?.reviews],
  );
  const [reviews, setReviews] = useState<ProductReview[]>(initial);
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!product) return null;

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId: product!.id, author, rating, body }),
      });
      const data = (await res.json().catch(() => ({}))) as { review?: ProductReview; error?: string };
      if (!res.ok || !data.review) {
        setError(data.error ?? 'Could not submit review.');
        return;
      }
      setReviews((prev) => [data.review!, ...prev]);
      setAuthor('');
      setBody('');
      setRating(5);
    } catch {
      setError('Could not submit review.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="vt-reviews flex flex-col gap-gutter border-t border-border pt-section" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="font-heading text-fg">
        Reviews
      </h2>
      {reviews.length === 0 ? (
        <p className="text-muted-fg">No reviews yet — be the first.</p>
      ) : (
        <ul role="list" className="flex flex-col gap-gutter">
          {reviews.map((r) => (
            <li key={r.id} className="flex flex-col gap-unit border-b border-border pb-unit">
              <p className="text-fg">
                <span className="font-medium">{r.author}</span>
                <span className="text-muted-fg"> — {r.rating}/5</span>
              </p>
              <p className="text-fg">{r.body}</p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="flex max-w-md flex-col gap-gutter">
        <label className="flex flex-col gap-unit text-sm">
          <span className="text-fg">Name</span>
          <input
            required
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="rounded-md border border-input bg-surface px-gutter py-unit text-surface-fg focus-visible:outline-none focus-visible:ring-2 ring-ring"
          />
        </label>
        <label className="flex flex-col gap-unit text-sm">
          <span className="text-fg">Rating</span>
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="rounded-md border border-input bg-surface px-gutter py-unit text-surface-fg focus-visible:outline-none focus-visible:ring-2 ring-ring"
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-unit text-sm">
          <span className="text-fg">Review</span>
          <textarea
            required
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="rounded-md border border-input bg-surface px-gutter py-unit text-surface-fg focus-visible:outline-none focus-visible:ring-2 ring-ring"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-md bg-primary px-gutter py-unit text-primary-fg disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 ring-ring"
        >
          {pending ? 'Submitting…' : 'Submit review'}
        </button>
        {error ? (
          <p role="alert" className="text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
