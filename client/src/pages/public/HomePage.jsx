import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowRight } from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import HealthPanel from '../../components/common/HealthPanel.jsx';
import ProductRail from '../../components/products/ProductRail.jsx';

function OrbitBackdrop() {
  return (
    <svg viewBox="0 0 600 600" className="pointer-events-none absolute -right-40 -top-32 w-[640px] opacity-40" aria-hidden="true">
      <g fill="none" stroke="#139c98" strokeWidth="1.5">
        <circle cx="300" cy="300" r="90" />
        <circle cx="300" cy="300" r="160" />
        <circle cx="300" cy="300" r="230" />
        <circle cx="300" cy="300" r="290" />
      </g>
      <g fill="#f2a33a">
        <circle cx="390" cy="300" r="7" />
        <circle cx="178" cy="415" r="6" />
        <circle cx="395" cy="124" r="6" />
        <circle cx="95" cy="238" r="5" />
      </g>
    </svg>
  );
}

export default function HomePage() {
  const categories = useSelector((s) => s.catalog.categories);
  const showDevPanel = import.meta.env.DEV; // connection check is a developer aid, hidden in production builds

  return (
    <>
      <section className="relative overflow-hidden bg-ink-900 text-white">
        <OrbitBackdrop />
        <div className={`relative mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:px-8 lg:py-20 ${showDevPanel ? 'lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-16' : ''}`}>
          <div>
            <p className="mb-4 inline-block rounded-full bg-marigold-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink-900">
              New sellers every week
            </p>
            <h1 className="max-w-xl text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              One marketplace for every independent seller
            </h1>
            <p className="mt-6 max-w-lg text-lg text-ink-300">
              Buy from many sellers in a single checkout, or open your own store and set your own prices.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button as={Link} to="/products" variant="accent" size="lg">Shop now</Button>
              <Button as={Link} to="/become-a-seller" variant="outlineLight" size="lg">Start selling</Button>
            </div>
          </div>
          {showDevPanel && <HealthPanel />}
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8" aria-labelledby="shop-by-category">
          <h2 id="shop-by-category" className="text-2xl font-bold sm:text-3xl">Shop by category</h2>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => (
              <li key={c.id}>
                <Link to={`/category/${c.slug}`} className="flex h-full min-h-24 flex-col justify-between rounded-2xl border border-ink-100 bg-white p-4 transition-colors hover:border-brand-500 hover:bg-brand-50">
                  <span className="font-display text-lg font-bold leading-tight">{c.name}</span>
                  <ArrowRight className="mt-3 size-4 text-brand-600" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ProductRail title="Trending now" params={{ sort: 'popularity', limit: 8 }} seeAllTo="/products?sort=popularity" />
      <ProductRail title="New arrivals" params={{ sort: 'newest', limit: 8 }} seeAllTo="/products?sort=newest" />

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-brand-900 p-8 text-white sm:flex-row sm:items-center sm:p-12">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Have something to sell?</h2>
            <p className="mt-2 max-w-md text-brand-100">Open a store, list products at your own prices and reach shoppers across the marketplace.</p>
          </div>
          <Button as={Link} to="/become-a-seller" variant="accent" size="lg">Become a seller</Button>
        </div>
      </section>
    </>
  );
}
