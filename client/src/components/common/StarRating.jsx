import { Star } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export default function StarRating({ rating = 0, count = 0, size = 'size-4', showCount = true }) {
  const label =
    count > 0 ? `Rated ${rating.toFixed(1)} out of 5 from ${count} reviews` : 'No reviews yet';

  return (
    <span className="inline-flex items-center gap-1.5" role="img" aria-label={label}>
      <span className="inline-flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={cn(size, n <= Math.round(rating) && count > 0 ? 'fill-marigold-500 text-marigold-500' : 'text-ink-300')}
          />
        ))}
      </span>
      {showCount && (
        <span className="text-xs text-ink-500" aria-hidden="true">
          {count > 0 ? `${rating.toFixed(1)} (${count})` : 'No reviews'}
        </span>
      )}
    </span>
  );
}
