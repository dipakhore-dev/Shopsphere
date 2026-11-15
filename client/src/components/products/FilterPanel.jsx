import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Button from '../common/Button.jsx';

const RATINGS = [
  { value: '', label: 'Any rating' },
  { value: '4', label: '4 stars & up' },
  { value: '3', label: '3 stars & up' },
];

/**
 * Filters are written straight into the URL (by the parent through onChange),
 * so results are shareable, bookmarkable and survive a refresh / the back button.
 * Price inputs are in RUPEES here; the page converts them to paise for the API.
 */
export default function FilterPanel({ values, onChange, hideCategory = false }) {
  const categories = useSelector((s) => s.catalog.categories);
  const [minPrice, setMinPrice] = useState(values.minPrice);
  const [maxPrice, setMaxPrice] = useState(values.maxPrice);

  // Keep the inputs in sync when the URL changes (e.g. "Clear all").
  useEffect(() => {
    setMinPrice(values.minPrice);
    setMaxPrice(values.maxPrice);
  }, [values.minPrice, values.maxPrice]);

  const applyPrice = (e) => {
    e.preventDefault();
    onChange({ minPrice, maxPrice });
  };

  const field = 'h-10 w-full rounded-lg border border-ink-300 bg-white px-3 text-sm';

  return (
    <div className="space-y-7">
      {!hideCategory && (
        <fieldset>
          <legend className="mb-2 text-sm font-bold">Category</legend>
          <div className="space-y-1.5">
            {[{ slug: '', name: 'All categories' }, ...categories].map((c) => (
              <label key={c.slug || 'all'} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="category"
                  checked={values.category === c.slug}
                  onChange={() => onChange({ category: c.slug })}
                  className="size-4 accent-brand-600"
                />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <form onSubmit={applyPrice}>
        <fieldset>
          <legend className="mb-2 text-sm font-bold">Price (Rs)</legend>
          <div className="flex items-center gap-2">
            <label className="flex-1">
              <span className="sr-only">Minimum price</span>
              <input type="number" min="0" inputMode="numeric" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className={field} />
            </label>
            <span aria-hidden="true">-</span>
            <label className="flex-1">
              <span className="sr-only">Maximum price</span>
              <input type="number" min="0" inputMode="numeric" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className={field} />
            </label>
          </div>
          <Button type="submit" variant="secondary" size="sm" className="mt-2 w-full">
            Apply price
          </Button>
        </fieldset>
      </form>

      <fieldset>
        <legend className="mb-2 text-sm font-bold">Customer rating</legend>
        <div className="space-y-1.5">
          {RATINGS.map((r) => (
            <label key={r.value || 'any'} className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" name="rating" checked={values.minRating === r.value} onChange={() => onChange({ minRating: r.value })} className="size-4 accent-brand-600" />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-bold">Availability</legend>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={values.inStock === 'true'} onChange={(e) => onChange({ inStock: e.target.checked ? 'true' : '' })} className="size-4 accent-brand-600" />
          In stock only
        </label>
      </fieldset>
    </div>
  );
}
