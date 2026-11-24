import { Link } from 'react-router-dom';
import SafeImage from '../common/SafeImage.jsx';
import StarRating from '../common/StarRating.jsx';
import PriceTag from './PriceTag.jsx';
import AddToCartButton from './AddToCartButton.jsx';
import WishlistButton from './WishlistButton.jsx';
import { optimizeImageUrl } from '../../utils/images.js';

export default function ProductCard({ product }) {
  const image = product.images[0]?.url;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white transition-shadow hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-ink-50">
        {image && (
          <SafeImage
            src={optimizeImageUrl(image, 500)}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        <WishlistButton productId={product.id} productName={product.name} className="absolute right-3 top-3 z-10" />
        {product.discountPercent > 0 && (
          <span className="absolute left-3 top-3 rounded-md bg-marigold-500 px-2 py-1 text-xs font-bold text-ink-900">
            {product.discountPercent}% OFF
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-0 bottom-0 bg-ink-900/80 py-1.5 text-center text-xs font-semibold text-white">
            Out of stock
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{product.brand}</p>
        <h3 className="line-clamp-2 font-sans text-base font-semibold leading-snug">
          {/* The whole card is clickable through this link's ::after overlay */}
          <Link to={`/products/${product.id}`} className="after:absolute after:inset-0 hover:text-brand-700">
            {product.name}
          </Link>
        </h3>
        <StarRating rating={product.averageRating} count={product.reviewCount} />
        <div className="mt-auto pt-2">
          <PriceTag product={product} />
        </div>
        {/* z-10 lifts the button above the card-wide link overlay */}
        <div className="relative z-10 pt-2">
          <AddToCartButton product={product} size="sm" variant="secondary" className="w-full" />
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-ink-100 bg-white" aria-hidden="true">
      <div className="aspect-square bg-ink-100" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/3 rounded bg-ink-100" />
        <div className="h-4 w-5/6 rounded bg-ink-100" />
        <div className="h-3 w-1/2 rounded bg-ink-100" />
        <div className="h-5 w-2/5 rounded bg-ink-100" />
      </div>
    </div>
  );
}
