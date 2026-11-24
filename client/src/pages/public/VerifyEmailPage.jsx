import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, TriangleAlert } from 'lucide-react';
import AuthCard from '../../components/auth/AuthCard.jsx';
import ResendMessage from '../../components/auth/ResendMessage.jsx';
import Button from '../../components/common/Button.jsx';
import FormField from '../../components/common/FormField.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useResendVerification } from '../../hooks/useResendVerification.js';
import { bootstrapAuth } from '../../redux/slices/authSlice.js';
import { selectCartCount } from '../../redux/slices/cartSlice.js';
import { resendVerification, verifyEmail } from '../../services/auth.service.js';
import { getErrorMessage } from '../../utils/errors.js';
import { EMAIL_PATTERN } from '../../utils/validation.js';

/** Logged in -> resend with one click. Logged out -> ask for the address (the answer never reveals if it exists). */
function ResendBox() {
  const { user } = useAuth();
  return user ? <ResendForLoggedIn /> : <ResendByEmail />;
}

function ResendForLoggedIn() {
  const { resend, sending, remaining, message } = useResendVerification();
  return (
    <div className="mt-5">
      <Button className="w-full" onClick={resend} loading={sending} disabled={remaining > 0}>
        {remaining > 0 ? `Resend available in ${remaining}s` : 'Send me a new link'}
      </Button>
      <ResendMessage message={message} />
    </div>
  );
}

function ResendByEmail() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!EMAIL_PATTERN.test(email)) return setError('Enter a valid email address');
    setError('');
    setSending(true);
    try {
      await resendVerification(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
    return undefined;
  };

  if (sent) {
    return <p role="status" className="mt-5 rounded-lg bg-green-50 p-3 text-sm font-medium text-success-600">If that address belongs to an unverified account, a new link is on its way.</p>;
  }
  return (
    <form onSubmit={submit} noValidate className="mt-5 space-y-3">
      <FormField label="Your email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
      <Button type="submit" className="w-full" loading={sending}>Send me a new link</Button>
    </form>
  );
}

export default function VerifyEmailPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const cartCount = useSelector(selectCartCount);

  // Read the token once, then remove it from the address bar so it does not linger in history or screenshots.
  const [token] = useState(() => searchParams.get('token'));
  const [state, setState] = useState({ status: token ? 'verifying' : 'missing', code: null, message: '' });
  const started = useRef(false); // the token is single-use: never send it twice (React StrictMode runs effects twice in dev)

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    setSearchParams({}, { replace: true });

    verifyEmail(token)
      .then(() => {
        setState({ status: 'success', code: null, message: '' });
        dispatch(bootstrapAuth()); // refresh the logged-in user so verified status is picked up everywhere
      })
      .catch((err) => setState({ status: 'error', code: err.response?.data?.code ?? null, message: getErrorMessage(err) }));
  }, [token, dispatch, setSearchParams]);

  // Where to go next: back to checkout if they have a cart, otherwise their account, or log in if signed out.
  const next = user ? (cartCount > 0 ? '/checkout' : '/account') : '/login';
  const nextLabel = user ? (cartCount > 0 ? 'Continue to checkout' : 'Go to my account') : 'Log in';

  useEffect(() => {
    if (state.status !== 'success') return undefined;
    const id = setTimeout(() => navigate(next, { replace: true }), 3500);
    return () => clearTimeout(id);
  }, [state.status, next, navigate]);

  // Someone who clicked the link twice (or opened it in a second tab) is already verified: say so, not "invalid".
  const alreadyVerified = state.status === 'error' && user?.isEmailVerified;

  return (
    <AuthCard title="Email verification">
      {state.status === 'verifying' && (
        <p role="status" className="flex items-center gap-3 text-ink-700">
          <Spinner className="size-5 text-brand-600" label="Verifying" /> Verifying your email...
        </p>
      )}

      {(state.status === 'success' || alreadyVerified) && (
        <div role="status">
          <p className="flex items-center gap-2 font-semibold text-success-600">
            <CheckCircle2 className="size-6" aria-hidden="true" /> {alreadyVerified ? 'Your email is already verified.' : 'Your email is verified. Thank you!'}
          </p>
          <p className="mt-2 text-sm text-ink-700">{state.status === 'success' ? 'Taking you there in a moment...' : 'Nothing more to do.'}</p>
          <Button as={Link} to={next} className="mt-5 w-full">{nextLabel}</Button>
        </div>
      )}

      {state.status === 'error' && !alreadyVerified && (
        <div>
          <p role="alert" className="flex items-start gap-2 font-medium text-danger-600">
            <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" /> {state.message}
          </p>
          <p className="mt-2 text-sm text-ink-700">
            {state.code === 'VERIFICATION_TOKEN_EXPIRED' ? 'Links expire for your safety. Request a new one below.' : 'Each link works only once. If you already used it, your email may already be verified. Otherwise request a new link.'}
          </p>
          <ResendBox />
        </div>
      )}

      {state.status === 'missing' && (
        <div>
          <p role="alert" className="font-medium text-danger-600">This page needs the link from your verification email.</p>
          <ResendBox />
        </div>
      )}
    </AuthCard>
  );
}
