import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { getDashboardPath } from '../utils/roles.js';

/**
 * For login/register: signed-in users are sent on to where they were headed
 * (set by ProtectedRoute) or to their role's dashboard.
 */
export default function GuestRoute() {
  const { user, initialized } = useAuth();
  const location = useLocation();

  if (!initialized) return null;

  if (user) {
    const from = location.state?.from;
    const target = from ? `${from.pathname}${from.search ?? ''}` : getDashboardPath(user.role);
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}
