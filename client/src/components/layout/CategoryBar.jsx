import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { cn } from '../../utils/cn.js';

const item = ({ isActive }) =>
  cn(
    'shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-ink-100',
  );

/** Horizontally scrollable category navigation under the main header. */
export default function CategoryBar() {
  const categories = useSelector((s) => s.catalog.categories);
  if (categories.length === 0) return null;

  return (
    <nav aria-label="Categories" className="border-t border-ink-100">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
        <NavLink to="/products" end className={item}>
          All
        </NavLink>
        {categories.map((c) => (
          <NavLink key={c.id} to={`/category/${c.slug}`} className={item}>
            {c.name}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
