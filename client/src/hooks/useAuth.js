import { useSelector } from 'react-redux';

/** { user, initialized, isAuthenticated } */
export function useAuth() {
  const { user, initialized } = useSelector((state) => state.auth);
  return { user, initialized, isAuthenticated: Boolean(user) };
}
