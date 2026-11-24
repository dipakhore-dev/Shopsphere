import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Heart } from 'lucide-react';
import ProductGrid from '../../components/products/ProductGrid.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Button from '../../components/common/Button.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { getWishlist } from '../../services/wishlist.service.js';

export default function WishlistPage() {
  const { status, data, error, reload } = useAsync((signal) => getWishlist(signal), []);
  const ids = useSelector((s) => s.wishlist.ids);

  // Removing a heart updates the store immediately, so the card disappears without another request.
  const products = (data ?? []).filter((p) => ids.includes(p.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold">My wishlist</h1>
      <div className="mt-6">
        {status === 'error' ? (
          <ErrorState message={error} onRetry={reload} />
        ) : status === 'loading' && !data ? (
          <ProductGrid loading skeletonCount={4} />
        ) : products.length === 0 ? (
          <EmptyState icon={Heart} title="Nothing saved yet" action={<Button as={Link} to="/products">Browse products</Button>}>
            Tap the heart on any product to keep it here for later.
          </EmptyState>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </div>
  );
}
