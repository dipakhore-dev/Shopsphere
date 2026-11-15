import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import AuthCard from '../../components/auth/AuthCard.jsx';
import Button from '../../components/common/Button.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { verifyEmail } from '../../services/auth.service.js';
import { bootstrapAuth } from '../../redux/slices/authSlice.js';
import { getErrorMessage } from '../../utils/errors.js';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const dispatch = useDispatch();
  const [state, setState] = useState({ status: token ? 'verifying' : 'missing', message: '' });
  const started = useRef(false); // the token is single-use: never send it twice (React StrictMode runs effects twice in dev)

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    verifyEmail(token)
      .then(() => {
        setState({ status: 'success', message: '' });
        dispatch(bootstrapAuth()); // refresh the logged-in user so the badge updates
      })
      .catch((err) => setState({ status: 'error', message: getErrorMessage(err) }));
  }, [token, dispatch]);

  return (
    <AuthCard title="Email verification">
      {state.status === 'verifying' && (
        <p role="status" className="flex items-center gap-3 text-ink-700">
          <Spinner className="size-5 text-brand-600" label="Verifying" /> Verifying your email...
        </p>
      )}

      {state.status === 'success' && (
        <>
          <p role="status" className="text-ink-700">
            Your email is verified. Thank you!
          </p>
          <Button as={Link} to="/account" className="mt-4 w-full">
            Go to my account
          </Button>
        </>
      )}

      {state.status === 'error' && (
        <>
          <p role="alert" className="text-danger-600">
            {state.message}
          </p>
          <p className="mt-2 text-sm text-ink-700">Log in and request a new verification email from your account page.</p>
          <Button as={Link} to="/account" variant="secondary" className="mt-4 w-full">
            Go to my account
          </Button>
        </>
      )}

      {state.status === 'missing' && (
        <p role="alert" className="text-danger-600">
          This page needs the link from your verification email.
        </p>
      )}
    </AuthCard>
  );
}
