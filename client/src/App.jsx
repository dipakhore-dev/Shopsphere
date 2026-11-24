import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import AppRoutes from './routes/AppRoutes.jsx';
import { useAuth } from './hooks/useAuth.js';
import { bootstrapAuth } from './redux/slices/authSlice.js';
import { loadCategories } from './redux/slices/catalogSlice.js';
import { loadCart, resetCart } from './redux/slices/cartSlice.js';
import { loadWishlistIds, resetWishlist } from './redux/slices/wishlistSlice.js';
import { ROLES } from './utils/roles.js';

export default function App() {
  const dispatch = useDispatch();
  const { user } = useAuth();

  // Ask the server who is logged in (cookies are HttpOnly, so JS cannot check by itself).
  useEffect(() => {
    dispatch(bootstrapAuth());
    dispatch(loadCategories());
  }, [dispatch]);

  // Cart and wishlist belong to the logged-in shopper: load them on login, wipe them on logout.
  const shopperId = user && user.role !== ROLES.ADMIN ? user.id : null;
  useEffect(() => {
    if (shopperId) {
      dispatch(loadCart());
      dispatch(loadWishlistIds());
    } else {
      dispatch(resetCart());
      dispatch(resetWishlist());
    }
  }, [shopperId, dispatch]);

  return <AppRoutes />;
}
