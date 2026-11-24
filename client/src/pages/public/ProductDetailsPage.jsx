import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Store, PackageCheck, PackageX } from 'lucide-react';
import ImageGallery from '../../components/products/ImageGallery.jsx';
import PriceTag from '../../components/products/PriceTag.jsx';
import StarRating from '../../components/common/StarRating.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Button from '../../components/common/Button.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import QuantityStepper from '../../components/common/QuantityStepper.jsx';
import AddToCartButton from '../../components/products/AddToCartButton.jsx';
import WishlistButton from '../../components/products/WishlistButton.jsx';
import { useRequireAuth } from '../../hooks/useRequireAuth.js';
import { useAsync } from '../../hooks/useAsync.js';
import { fetchProduct } from '../../services/product.service.js';

function Stock({ stock }) {
  if (stock === 0) {
    return (
      <p className="flex items-center gap-2 font-semibold text-danger-600">
        <PackageX className="size-5" aria-hidden="true" /> Out of stock
      </p>
    );
  }
  return (
    <p className="flex items-center gap-2 font-semibold text-success-600">
      <PackageCheck className="size-5" aria-hidden="true" />
      {stock <= 10 ? `Only ${stock} left in stock` : 'In stock'}
    </p>
  );
}

function PurchasePanel({ product }) {
  const navigate = useNavigate();
  const requireAuth = useRequireAuth();
  const [qty, setQty] = useState(1);
  const max = Math.min(10, product.stock);

  return (
    <div className="mt-6 space-y-4">
      {product.inStock && (
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Quantity</span>
          <QuantityStepper value={qty} max={max} onChange={setQty} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <AddToCartButton product={product} quantity={qty} size="lg" />
        {product.inStock && (
          <Button size="lg" variant="accent" onClick={() => requireAuth() && navigate(`/checkout?buyNow=${product.id}&qty=${qty}`)}>
            Buy now
          </Button>
        )}
        <WishlistButton productId={product.id} productName={product.name} className="size-12 border border-ink-100" />
      </div>
    </div>
  );
}

export default function ProductDetailsPage() {
  const { id } = useParams();
  const { status, data: product, error, httpStatus, reload } = useAsync((signal) => fetchProduct(id, signal), [id]);

  if (status === 'loading' && !product) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-brand-600">
        <Spinner className="size-8" label="Loading product" />
      </div>
    );
  }

  if (status === 'error') {
    const missing = httpStatus === 404 || httpStatus === 400;
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        {missing ? (
          <div className="text-center">
            <h1 className="text-3xl font-bold">This product is not available</h1>
            <p className="mt-3 text-ink-700">It may have been removed or is no longer for sale.</p>
            <Button as={Link} to="/products" className="mt-8">Browse products</Button>
          </div>
        ) : (
          <ErrorState message={error} onRetry={reload} />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-ink-500">
        <Link to="/" className="hover:text-brand-700">Home</Link> /{' '}
        {product.category.slug && (
          <>
            <Link to={`/category/${product.category.slug}`} className="hover:text-brand-700">{product.category.name}</Link> /{' '}
          </>
        )}
        <span className="text-ink-900">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ImageGallery images={product.images} alt={product.name} />

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">{product.brand}</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight sm:text-4xl">{product.name}</h1>

          <div className="mt-3">
            <StarRating rating={product.averageRating} count={product.reviewCount} size="size-5" />
          </div>

          <div className="mt-5">
            <PriceTag product={product} large />
            <p className="mt-1 text-xs text-ink-500">Inclusive of all taxes</p>
          </div>

          <div className="mt-5">
            <Stock stock={product.stock} />
          </div>

          {product.store.storeName && (
            <p className="mt-5 flex items-center gap-2 text-sm text-ink-700">
              <Store className="size-4" aria-hidden="true" /> Sold by <strong>{product.store.storeName}</strong>
            </p>
          )}

          <PurchasePanel key={product.id} product={product} />

          <section className="mt-8" aria-labelledby="desc-heading">
            <h2 id="desc-heading" className="text-xl font-bold">About this item</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-700">{product.description}</p>
          </section>

          {product.specifications.length > 0 && (
            <section className="mt-8" aria-labelledby="spec-heading">
              <h2 id="spec-heading" className="text-xl font-bold">Specifications</h2>
              <dl className="mt-3 divide-y divide-ink-100 rounded-xl border border-ink-100 bg-white">
                {product.specifications.map((s) => (
                  <div key={s.key} className="grid grid-cols-[2fr_3fr] gap-4 px-4 py-2.5 text-sm">
                    <dt className="text-ink-500">{s.key}</dt>
                    <dd className="font-medium">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
