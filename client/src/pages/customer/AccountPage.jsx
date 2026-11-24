import { Link } from 'react-router-dom';
import { BadgeCheck, Heart, MailWarning, MapPin, Package, Store } from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import ResendMessage from '../../components/auth/ResendMessage.jsx';
import { useResendVerification } from '../../hooks/useResendVerification.js';

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink-100 py-3 last:border-b-0">
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd className="text-sm font-semibold capitalize text-ink-900">{children}</dd>
    </div>
  );
}

/** Account overview with shortcuts. Profile editing and password change arrive in a later phase. */
export default function AccountPage() {
  const { user } = useAuth();
  const { resend, sending, remaining, message } = useResendVerification();

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

      <nav aria-label="Account shortcuts" className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          { to: '/orders', label: 'My orders', hint: 'Track, cancel or review past orders', icon: Package },
          { to: '/wishlist', label: 'Wishlist', hint: 'Products you saved for later', icon: Heart },
          { to: '/account/addresses', label: 'Saved addresses', hint: 'Manage where we deliver', icon: MapPin },
          ...(user.role === 'seller' ? [{ to: '/seller', label: 'Seller dashboard', hint: 'Your store and products', icon: Store }] : []),
        ].map(({ to, label, hint, icon: Icon }) => (
          <Link key={to} to={to} className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-4 transition-colors hover:border-brand-500">
            <Icon className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden="true" />
            <span><span className="block font-semibold">{label}</span><span className="text-sm text-ink-700">{hint}</span></span>
          </Link>
        ))}
      </nav>

      {user.isEmailVerified ? (
        <p className="mt-6 flex items-center gap-2 text-sm font-medium text-success-600">
          <BadgeCheck className="size-5" aria-hidden="true" /> Your email address is verified.
        </p>
      ) : (
        <div className="mt-6 rounded-xl bg-amber-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-sm text-ink-900">
              <MailWarning className="mt-0.5 size-5 shrink-0 text-marigold-600" aria-hidden="true" />
              Verify {user.email} to place orders and apply as a seller.
            </p>
            <Button variant="accent" size="sm" onClick={resend} loading={sending} disabled={remaining > 0}>
              {remaining > 0 ? `Resend in ${remaining}s` : 'Resend email'}
            </Button>
          </div>
          <ResendMessage message={message} />
        </div>
      )}
    </div>
  );
}
