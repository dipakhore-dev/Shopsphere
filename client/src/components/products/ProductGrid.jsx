import ProductCard, { ProductCardSkeleton } from './ProductCard.jsx';

const GRID = 'grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4';

export default function ProductGrid({ products, loading = false, skeletonCount = 8 }) {
  if (loading) {
    return (
      <div className={GRID} role="status" aria-label="Loading products">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  return (
    <div className={GRID}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
