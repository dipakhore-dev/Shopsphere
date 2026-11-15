import { useEffect, useId, useRef, useState } from 'react';
import SafeImage from '../common/SafeImage.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Tag } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce.js';
import { fetchSuggestions } from '../../services/product.service.js';
import { formatPrice } from '../../utils/money.js';
import { optimizeImageUrl } from '../../utils/images.js';
import { cn } from '../../utils/cn.js';

/**
 * Accessible "combobox with listbox popup" (WAI-ARIA pattern):
 * - Up/Down move through suggestions, Enter opens one (or searches), Esc closes
 * - suggestions are debounced and the previous request is aborted
 */
export default function SearchBar({ className }) {
  const navigate = useNavigate();
  const location = useLocation();
  const listId = useId();
  const wrapperRef = useRef(null);

  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [results, setResults] = useState({ products: [], categories: [] });
  const debounced = useDebounce(value.trim(), 250);

  // Show the current query when sitting on the search results page.
  useEffect(() => {
    if (location.pathname === '/search') setValue(new URLSearchParams(location.search).get('q') ?? '');
    else setValue('');
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (debounced.length < 2) {
      setResults({ products: [], categories: [] });
      return undefined;
    }
    const controller = new AbortController();
    fetchSuggestions(debounced, controller.signal)
      .then(setResults)
      .catch((err) => {
        if (!axios.isCancel(err)) setResults({ products: [], categories: [] });
      });
    return () => controller.abort();
  }, [debounced]);

  const options = [
    ...results.categories.map((c) => ({ key: `c-${c.id}`, kind: 'category', label: c.name, to: `/category/${c.slug}` })),
    ...results.products.map((p) => ({ key: `p-${p.id}`, kind: 'product', label: p.name, price: p.finalPrice, image: p.image, to: `/products/${p.id}` })),
  ];
  const showList = open && value.trim().length >= 2 && options.length > 0;

  const go = (to) => {
    setOpen(false);
    setActive(-1);
    navigate(to);
  };

  const submit = (e) => {
    e.preventDefault();
    if (active >= 0 && options[active]) return go(options[active].to);
    const q = value.trim();
    if (q) go(`/search?q=${encodeURIComponent(q)}`);
    return undefined;
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (options.length ? (i + 1) % options.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (options.length ? (i <= 0 ? options.length - 1 : i - 1) : -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={cn('relative', className)}
      onBlur={(e) => {
        if (!wrapperRef.current?.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <form role="search" onSubmit={submit}>
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search products
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-500" aria-hidden="true" />
          <input
            id={`${listId}-input`}
            type="search"
            role="combobox"
            aria-expanded={showList}
            aria-controls={`${listId}-list`}
            aria-autocomplete="list"
            aria-activedescendant={showList && active >= 0 ? `${listId}-opt-${active}` : undefined}
            autoComplete="off"
            maxLength={100}
            placeholder="Search products, brands and categories"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="h-11 w-full rounded-lg border border-ink-300 bg-ink-50 pl-10 pr-3 text-sm placeholder:text-ink-500 focus:bg-white"
          />
        </div>
      </form>

      {showList && (
        <ul
          id={`${listId}-list`}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-xl border border-ink-100 bg-white py-1 shadow-xl"
        >
          {options.map((o, i) => (
            <li
              key={o.key}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown (not click) so it fires before the input loses focus and closes the list
              onMouseDown={(e) => {
                e.preventDefault();
                go(o.to);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn('flex cursor-pointer items-center gap-3 px-3 py-2 text-sm', i === active && 'bg-brand-50')}
            >
              {o.kind === 'category' ? (
                <>
                  <Tag className="size-5 shrink-0 text-brand-600" aria-hidden="true" />
                  <span>
                    {o.label} <span className="text-ink-500">in categories</span>
                  </span>
                </>
              ) : (
                <>
                  {o.image ? (
                    <SafeImage src={optimizeImageUrl(o.image, 80)} alt="" className="size-9 shrink-0 rounded object-cover" />
                  ) : (
                    <span className="size-9 shrink-0 rounded bg-ink-100" />
                  )}
                  <span className="line-clamp-1 flex-1">{o.label}</span>
                  <span className="shrink-0 font-semibold">{formatPrice(o.price)}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
