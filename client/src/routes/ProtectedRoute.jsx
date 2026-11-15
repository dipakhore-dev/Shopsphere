import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import Spinner from '../components/common/Spinner.jsx';
import ForbiddenPage from '../pages/public/ForbiddenPage.jsx';

/**
 * Layout route that guards its children.
 *   <Route element={<ProtectedRoute />}>                    any logged-in user
 *   <Route element={<ProtectedRoute roles={['admin']} />}>  only these roles
 *
 * This is a UX convenience. The REAL enforcement is the backend (authenticate + authorize).
 */
export default function ProtectedRoute({ roles }) {
  const { user, initialized } = useAuth();
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-brand-600">
        <Spinner className="size-8" label="Checking your session" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <ForbiddenPage />;

  return <Outlet />;
}
