import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

/**
 * Sends logged-in users with an unverified email to the "verification required" page, remembering where
 * they were going. Use INSIDE <ProtectedRoute>. This is only the user-friendly layer: the API itself
 * answers 403 EMAIL_NOT_VERIFIED to unverified customers, so skipping this page gains nothing.
 */
export default function RequireVerifiedEmail() {
  const { user } = useAuth();
  const location = useLocation();

  if (user && !user.isEmailVerified) {
    return <Navigate to="/verify-email/required" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
