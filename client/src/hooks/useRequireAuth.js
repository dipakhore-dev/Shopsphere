import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from './useAuth.js';

/**
 * const requireAuth = useRequireAuth();
 * if (!requireAuth()) return;   // sends guests to /login and brings them back afterwards
 */
export function useRequireAuth() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    if (user) return true;
    toast('Please log in to continue');
    navigate('/login', { state: { from: location } });
    return false;
  }, [user, navigate, location]);
}
