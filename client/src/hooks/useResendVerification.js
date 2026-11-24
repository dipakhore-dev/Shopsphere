import { useCallback, useEffect, useState } from 'react';
import { getVerificationStatus, resendVerification } from '../services/auth.service.js';
import { getErrorMessage } from '../utils/errors.js';
import { useCountdown } from './useCountdown.js';

/**
 * Shared by the account page and the "verification required" page.
 *   const { resend, sending, remaining, message } = useResendVerification();
 * - starts the cooldown timer from the server's value (so a page refresh cannot bypass it)
 * - message = { type: 'success' | 'warning' | 'error', text }
 */
export function useResendVerification() {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);
  const { remaining, start } = useCountdown();

  useEffect(() => {
    let alive = true;
    getVerificationStatus()
      .then((s) => alive && s.cooldownSeconds > 0 && start(s.cooldownSeconds))
      .catch(() => {}); // the button still works; the server enforces the cooldown anyway
    return () => {
      alive = false;
    };
  }, [start]);

  const resend = useCallback(async () => {
    setSending(true);
    setMessage(null);
    try {
      const { data } = await resendVerification();
      start(data.cooldownSeconds ?? 60);
      setMessage(
        data.delivery === 'simulated'
          ? { type: 'warning', text: 'Development mode: no real email was sent because SMTP is not configured. Open the verification link printed in the server terminal.' }
          : { type: 'success', text: 'Verification email sent. Check your inbox and your spam folder.' },
      );
    } catch (err) {
      const body = err.response?.data;
      if (body?.code === 'RESEND_COOLDOWN') start(body.details?.retryAfterSeconds ?? 60);
      setMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setSending(false);
    }
  }, [start]);

  return { resend, sending, remaining, message };
}
