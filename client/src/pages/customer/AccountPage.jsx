import { useState } from 'react';
import toast from 'react-hot-toast';
import { BadgeCheck, MailWarning } from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { resendVerification } from '../../services/auth.service.js';
import { getErrorMessage } from '../../utils/errors.js';

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink-100 py-3 last:border-b-0">
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd className="text-sm font-semibold capitalize text-ink-900">{children}</dd>
    </div>
  );
}

/** Minimal account overview. Full profile, addresses and password change arrive in Phase 4. */
export default function AccountPage() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);

  const handleResend = async () => {
    setSending(true);
    try {
      await resendVerification();
      toast.success('Verification email sent. Check your inbox.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold">My account</h1>

      <section aria-labelledby="profile-heading" className="mt-8 rounded-2xl border border-ink-100 bg-white p-6">
        <h2 id="profile-heading" className="sr-only">
          Profile
        </h2>
        <dl>
          <Row label="Name">{user.name}</Row>
          <Row label="Email">
            <span className="normal-case">{user.email}</span>
          </Row>
          <Row label="Role">{user.role}</Row>
          <Row label="Member since">
            {new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </Row>
        </dl>
      </section>

      {user.isEmailVerified ? (
        <p className="mt-6 flex items-center gap-2 text-sm font-medium text-success-600">
          <BadgeCheck className="size-5" aria-hidden="true" /> Your email address is verified.
        </p>
      ) : (
        <div role="status" className="mt-6 flex flex-col gap-3 rounded-xl bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm text-ink-900">
            <MailWarning className="mt-0.5 size-5 shrink-0 text-marigold-600" aria-hidden="true" />
            Verify your email to place orders and apply as a seller.
          </p>
          <Button variant="accent" size="sm" onClick={handleResend} loading={sending}>
            Resend email
          </Button>
        </div>
      )}
    </div>
  );
}
