import { useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { ShoppingCart } from 'lucide-react';
import Button from '../common/Button.jsx';
import { addToCart } from '../../redux/slices/cartSlice.js';
import { useRequireAuth } from '../../hooks/useRequireAuth.js';

export default function AddToCartButton({ product, quantity = 1, size = 'md', variant = 'primary', className }) {
  const dispatch = useDispatch();
  const requireAuth = useRequireAuth();
  const [loading, setLoading] = useState(false);

  if (!product.inStock) {
    return (
      <Button variant="secondary" size={size} disabled className={className}>
        Out of stock
      </Button>
    );
  }

  const handleClick = async () => {
    if (!requireAuth()) return;
    setLoading(true);
    try {
      await dispatch(addToCart({ productId: product.id, quantity })).unwrap();
      toast.success('Added to cart');
    } catch (message) {
      toast.error(typeof message === 'string' ? message : 'Could not add to cart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant={variant} size={size} loading={loading} onClick={handleClick} className={className}>
      {!loading && <ShoppingCart className="size-4" aria-hidden="true" />}
      Add to cart
    </Button>
  );
}
