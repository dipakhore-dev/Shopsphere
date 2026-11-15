import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ProductGrid from './ProductGrid.jsx';
import ErrorState from '../common/ErrorState.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { fetchProducts } from '../../services/product.service.js';

/** A titled row of products used on the home page ("Trending", "New arrivals"). */
export default function ProductRail({ title, params, seeAllTo }) {
  const key = JSON.stringify(params);
  const { status, data, error, reload } = useAsync((signal) => fetchProducts(params, signal), [key]);

  if (status === 'success' && data.products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
        <Link to={seeAllTo} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
          See all <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      {status === 'error' ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <ProductGrid products={data?.products ?? []} loading={status === 'loading' && !data} skeletonCount={params.limit} />
      )}
    </section>
  );
}
