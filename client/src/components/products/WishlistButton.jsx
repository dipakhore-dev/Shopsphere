import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { Heart } from 'lucide-react';
import { removeFromWishlist, saveToWishlist } from '../../redux/slices/wishlistSlice.js';
import { useRequireAuth } from '../../hooks/useRequireAuth.js';
import { cn } from '../../utils/cn.js';

export default function WishlistButton({ productId, productName = 'product', className }) {
  const dispatch = useDispatch();
  const requireAuth = useRequireAuth();
  const saved = useSelector((s) => s.wishlist.ids.includes(productId));
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (!requireAuth()) return;
    setBusy(true);
    try {
      await dispatch((saved ? removeFromWishlist : saveToWishlist)(productId)).unwrap();
      toast.success(saved ? 'Removed from wishlist' : 'Saved to wishlist');
    } catch (message) {
      toast.error(typeof message === 'string' ? message : 'Could not update wishlist');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`}
      className={cn('inline-flex size-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition-colors hover:bg-white disabled:opacity-60', className)}
    >
      <Heart className={cn('size-5', saved ? 'fill-danger-600 text-danger-600' : 'text-ink-700')} aria-hidden="true" />
    </button>
  );
}
