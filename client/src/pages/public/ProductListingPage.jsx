import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { PackageSearch, SlidersHorizontal, X } from 'lucide-react';
import ProductGrid from '../../components/products/ProductGrid.jsx';
import FilterPanel from '../../components/products/FilterPanel.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Button from '../../components/common/Button.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { fetchProducts } from '../../services/product.service.js';
import { rupeesToPaise } from '../../utils/money.js';

const PAGE_SIZE = 12;

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popularity', label: 'Popularity' },
  { value: 'rating', label: 'Customer rating' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

/**
 * Serves three routes:  /products   /search?q=...   /category/:slug
 * The URL is the single source of truth for q, filters, sort and page.
 */
export default function ProductListingPage() {
  const { slug } = useParams(); // present on /category/:slug
  const [searchParams, setSearchParams] = useSearchParams();
  const categories = useSelector((s) => s.catalog.categories);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = searchParams.get('q') ?? '';
  const category = slug ?? searchParams.get('category') ?? '';
  const minPrice = searchParams.get('minPrice') ?? '';
  const maxPrice = searchParams.get('maxPrice') ?? '';
  const minRating = searchParams.get('minRating') ?? '';
  const inStock = searchParams.get('inStock') ?? '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const sort = searchParams.get('sort') ?? (q ? 'relevance' : 'newest');

  // Merges changes into the URL; any filter change goes back to page 1.
  const update = (changes) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === '' || value == null) next.delete(key);
      else next.set(key, value);
    });
    if (!('page' in changes)) next.delete('page');
    setSearchParams(next);
  };

  const params = {
    q,
    category,
    minPrice: minPrice !== '' ? rupeesToPaise(minPrice) : '',
    maxPrice: maxPrice !== '' ? rupeesToPaise(maxPrice) : '',
    minRating,
    inStock,
    sort: searchParams.get('sort') ?? '',
    page,
    limit: PAGE_SIZE,
  };
  const { status, data, error, reload } = useAsync((signal) => fetchProducts(params, signal), [JSON.stringify(params)]);

  const categoryName = categories.find((c) => c.slug === category)?.name;
  const title = q ? `Results for "${q}"` : categoryName ?? (slug ? 'Category' : 'All products');
  const activeFilters = [minPrice, maxPrice, minRating, inStock, !slug && category].filter(Boolean).length;

  const loading = status === 'loading';
  const meta = data?.meta;
  const sortOptions = q ? [{ value: 'relevance', label: 'Relevance' }, ...SORTS] : SORTS;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-ink-500">
        <Link to="/" className="hover:text-brand-700">Home</Link> / <span className="text-ink-900">{title}</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-ink-500" aria-live="polite">
            {meta ? `${meta.total} ${meta.total === 1 ? 'product' : 'products'}` : '\u00a0'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen} aria-controls="filters">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filters{activeFilters > 0 && ` (${activeFilters})`}
          </Button>
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only sm:not-sr-only">Sort by</span>
            <select value={sort} onChange={(e) => update({ sort: e.target.value })} className="h-9 rounded-lg border border-ink-300 bg-white px-2 text-sm">
              {sortOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside id="filters" aria-label="Filters" className={`${filtersOpen ? 'block' : 'hidden'} rounded-2xl border border-ink-100 bg-white p-5 lg:sticky lg:top-40 lg:block lg:self-start`}>
          <FilterPanel values={{ category, minPrice, maxPrice, minRating, inStock }} onChange={update} hideCategory={Boolean(slug)} />
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" className="mt-6 w-full" onClick={() => update({ category: '', minPrice: '', maxPrice: '', minRating: '', inStock: '' })}>
              <X className="size-4" aria-hidden="true" /> Clear filters
            </Button>
          )}
        </aside>

        <section aria-label="Products" className={loading && data ? 'opacity-60 transition-opacity' : ''}>
          {status === 'error' ? (
            <ErrorState message={error} onRetry={reload} />
          ) : loading && !data ? (
            <ProductGrid loading skeletonCount={PAGE_SIZE} />
          ) : data?.products.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="No products found"
              action={activeFilters > 0 || q ? (
                <Button as={Link} to={slug ? `/category/${slug}` : '/products'} variant="secondary">
                  Clear search and filters
                </Button>
              ) : null}
            >
              {q ? `Nothing matched "${q}". Check the spelling or try a more general word.` : 'Try changing or removing some filters.'}
            </EmptyState>
          ) : (
            <>
              <ProductGrid products={data.products} />
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                onChange={(p) => {
                  update({ page: p });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
