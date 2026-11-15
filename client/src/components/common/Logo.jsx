import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn.js';

export default function Logo({ className, light = false }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2.5', className)} aria-label="ShopSphere home">
      <svg viewBox="0 0 64 64" className="size-8" aria-hidden="true">
        <circle cx="32" cy="32" r="22" fill="none" stroke="#139c98" strokeWidth="7" />
        <circle cx="32" cy="32" r="8" fill="#f2a33a" />
      </svg>
      <span
        className={cn(
          'font-display text-xl font-bold tracking-tight',
          light ? 'text-white' : 'text-ink-900',
        )}
      >
        ShopSphere
      </span>
    </Link>
  );
}
