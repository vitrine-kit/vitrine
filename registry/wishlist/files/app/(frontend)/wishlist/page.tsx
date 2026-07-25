import type { Metadata } from 'next';
import { WishlistView } from '@/components/wishlist/WishlistView';

export const metadata: Metadata = {
  title: 'Wishlist',
  robots: { index: false, follow: true },
};

export default function WishlistPage() {
  return (
    <div className="flex flex-col gap-section">
      <h1 className="font-heading text-fg">Wishlist</h1>
      <WishlistView />
    </div>
  );
}
