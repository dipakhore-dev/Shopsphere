import { useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { MailCheck } from 'lucide-react';
import AuthCard, { authLinkClass } from '../../components/auth/AuthCard.jsx';
import ResendMessage from '../../components/auth/ResendMessage.jsx';
import Button from '../../components/common/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useResendVerification } from '../../hooks/useResendVerification.js';
import { bootstrapAuth } from '../../redux/slices/authSlice.js';

/** Shown when an unverified customer reaches checkout. Lives under <ProtectedRoute>, so `user` always exists. */
export default function VerificationRequiredPage() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const location = useLocation();
  const { resend, sending, remaining, message } = useResendVerification();

  const from = location.state?.from;
  const returnTo = from ? `${from.pathname}${from.search ?? ''}` : '/cart';

  // The link is often opened in another tab. When this tab regains focus, re-check the account.
  useEffect(() => {
    const refresh = () => dispatch(bootstrapAuth());
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [dispatch]);

  if (user.isEmailVerified) return <Navigate to={returnTo} replace />;

  return (
    <AuthCard
      title="Verify your email to check out"
      subtitle="We need to confirm your email address before you can place an order."
      footer={<Link to="/account" className={authLinkClass}>Back to my account</Link>}
    >
      <div className="flex items-start gap-3">
        <MailCheck className="mt-0.5 size-6 shrink-0 text-brand-600" aria-hidden="true" />
        <p className="text-sm text-ink-700">
          We sent a verification link to <strong className="break-all text-ink-900">{user.email}</strong>. Open it, then come back here: this page continues on its own once your address is verified.
          Your cart is safe in the meantime.
        </p>
      </div>

      <Button className="mt-6 w-full" onClick={resend} loading={sending} disabled={remaining > 0}>
        {remaining > 0 ? `Resend available in ${remaining}s` : 'Resend verification email'}
      </Button>
      <ResendMessage message={message} />
      <p className="mt-4 text-xs text-ink-500">Cannot find it? Check your spam folder. The link works once and expires after a short time.</p>
    </AuthCard>
  );
}
