import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import AppRoutes from './routes/AppRoutes.jsx';
import { bootstrapAuth } from './redux/slices/authSlice.js';
import { loadCategories } from './redux/slices/catalogSlice.js';

export default function App() {
  const dispatch = useDispatch();

  // Ask the server who is logged in (cookies are HttpOnly, so JS cannot check by itself).
  useEffect(() => {
    dispatch(bootstrapAuth());
    dispatch(loadCategories());
  }, [dispatch]);

  return <AppRoutes />;
}
