import { formatPrice } from '../../utils/money.js';
import { cn } from '../../utils/cn.js';

export default function PriceTag({ product, large = false }) {
  const discounted = product.discountPrice != null;
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={cn('font-bold text-ink-900', large ? 'text-3xl' : 'text-lg')}>{formatPrice(product.finalPrice)}</span>
      {discounted && (
        <>
          <span className={cn('text-ink-500 line-through', large ? 'text-base' : 'text-sm')}>
            <span className="sr-only">Original price </span>
            {formatPrice(product.price)}
          </span>
          <span className={cn('font-semibold text-success-600', large ? 'text-base' : 'text-sm')}>{product.discountPercent}% off</span>
        </>
      )}
    </div>
  );
}
