import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { AlertTriangle, Banknote, CreditCard } from 'lucide-react';
import AddressCard from '../../components/shop/AddressCard.jsx';
import AddressForm from '../../components/shop/AddressForm.jsx';
import OrderSummary from '../../components/shop/OrderSummary.jsx';
import Button from '../../components/common/Button.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import SafeImage from '../../components/common/SafeImage.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useAuth } from '../../hooks/useAuth.js';
import { bootstrapAuth } from '../../redux/slices/authSlice.js';
import { loadCart } from '../../redux/slices/cartSlice.js';
import { createAddress, listAddresses } from '../../services/address.service.js';
import { placeOrder, previewCheckout } from '../../services/order.service.js';
import { getErrorMessage } from '../../utils/errors.js';
import { optimizeImageUrl } from '../../utils/images.js';
import { formatPrice } from '../../utils/money.js';

/**
 * /checkout            -> checks out the whole cart
 * /checkout?buyNow=ID&qty=N -> buys one product and leaves the cart alone
 */
export default function CheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();

  const buyNowId = params.get('buyNow');
  const qty = Math.min(10, Math.max(1, Number(params.get('qty')) || 1));
  const buyNow = buyNowId ? { productId: buyNowId, quantity: qty } : undefined;

  const preview = useAsync((signal) => previewCheckout(buyNow, signal), [buyNowId, qty]);
  const addresses = useAsync((signal) => listAddresses(signal), []);

  const [selected, setSelected] = useState(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  // ONE key for this checkout. If the request is repeated (double click, bad network) the server
  // recognises the key and returns the first order instead of creating a duplicate.
  const keyRef = useRef(null);
  if (!keyRef.current) keyRef.current = crypto.randomUUID();

  useEffect(() => {
    if (addresses.data && !selected) setSelected((addresses.data.find((a) => a.isDefault) ?? addresses.data[0])?.id ?? null);
  }, [addresses.data, selected]);

  const saveAddress = async (values) => {
    try {
      const created = await createAddress(values);
      setSelected(created.id);
      setAddingAddress(false);
      addresses.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handlePlaceOrder = async () => {
    setError('');
    setPlacing(true);
    try {
      const order = await placeOrder({ addressId: selected, paymentMethod: 'cod', ...(buyNow ? { buyNow } : {}) }, keyRef.current);
      if (!buyNow) dispatch(loadCart());
      navigate(`/payment/result?order=${order.id}&status=success`, { replace: true });
    } catch (err) {
      if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        // The server is the authority. Refresh the account; the route guard then shows the verification page.
        dispatch(bootstrapAuth());
        navigate('/verify-email/required', { replace: true, state: { from: { pathname: '/checkout', search: window.location.search } } });
        return;
      }
      setError(getErrorMessage(err));
      preview.reload(); // show the latest stock and prices
      setPlacing(false);
    }
  };

  if (preview.status === 'error') return <div className="mx-auto max-w-3xl px-4 py-12"><ErrorState message={preview.error} onRetry={preview.reload} /></div>;
  if (!preview.data) return <div className="mx-auto max-w-7xl px-4 py-12"><div className="h-64 animate-pulse rounded-2xl bg-ink-100" role="status" aria-label="Loading checkout" /></div>;

  const checkout = preview.data;
  if (checkout.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold">Nothing to check out</h1>
        <p className="mt-2 text-ink-700">Your cart is empty.</p>
        <Button as={Link} to="/products" className="mt-6">Browse products</Button>
      </div>
    );
  }

  const emailOk = user.isEmailVerified;
  const canPlace = checkout.canCheckout && Boolean(selected) && emailOk && !placing;
  const card = 'rounded-2xl border border-ink-100 bg-white p-5 sm:p-6';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold">Checkout</h1>

      {!emailOk && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-marigold-600" aria-hidden="true" />
          <span>Verify your email to place orders. <Link to="/account" className="font-semibold text-brand-700 underline">Go to my account</Link> to resend the link.</span>
        </p>
      )}
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-sm font-medium text-danger-600">{error}</p>}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <section aria-labelledby="addr-heading" className={card}>
            <h2 id="addr-heading" className="text-xl font-bold">1. Delivery address</h2>
            {addresses.status === 'error' ? (
              <div className="mt-4"><ErrorState message={addresses.error} onRetry={addresses.reload} /></div>
            ) : !addresses.data ? (
              <div className="mt-4 h-24 animate-pulse rounded-xl bg-ink-100" />
            ) : (
              <>
                {addresses.data.length > 0 && (
                  <fieldset className="mt-4 space-y-3">
                    <legend className="sr-only">Choose a delivery address</legend>
                    {addresses.data.map((a) => (
                      <label key={a.id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${selected === a.id ? 'border-brand-600 bg-brand-50' : 'border-ink-100'}`}>
                        <input type="radio" name="address" checked={selected === a.id} onChange={() => setSelected(a.id)} className="mt-1 size-4 accent-brand-600" />
                        <AddressCard address={a} />
                      </label>
                    ))}
                  </fieldset>
                )}
                {addingAddress || addresses.data.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-ink-300 p-4">
                    <AddressForm onSubmit={saveAddress} onCancel={addresses.data.length > 0 ? () => setAddingAddress(false) : undefined} submitLabel="Save and use this address" />
                  </div>
                ) : (
                  <Button variant="secondary" size="sm" className="mt-4" onClick={() => setAddingAddress(true)}>+ Add a new address</Button>
                )}
              </>
            )}
          </section>

          <section aria-labelledby="pay-heading" className={card}>
            <h2 id="pay-heading" className="text-xl font-bold">2. Payment method</h2>
            <fieldset className="mt-4 space-y-3">
              <legend className="sr-only">Choose how to pay</legend>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-600 bg-brand-50 p-4">
                <input type="radio" name="payment" checked readOnly className="mt-1 size-4 accent-brand-600" />
                <span>
                  <span className="flex items-center gap-2 font-semibold"><Banknote className="size-5 text-brand-600" aria-hidden="true" /> Cash on delivery</span>
                  <span className="mt-0.5 block text-sm text-ink-700">Pay in cash when your order arrives.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-ink-100 p-4 opacity-60">
                <input type="radio" name="payment" disabled className="mt-1 size-4" />
                <span>
                  <span className="flex items-center gap-2 font-semibold"><CreditCard className="size-5" aria-hidden="true" /> Pay online (UPI, cards, netbanking)</span>
                  <span className="mt-0.5 block text-sm text-ink-700">Coming soon.</span>
                </span>
              </label>
            </fieldset>
          </section>

          <section aria-labelledby="review-heading" className={card}>
            <h2 id="review-heading" className="text-xl font-bold">3. Review items</h2>
            <ul className="mt-4 divide-y divide-ink-100">
              {checkout.items.map((i) => (
                <li key={i.productId} className="flex gap-4 py-3">
                  <SafeImage src={optimizeImageUrl(i.product?.images[0]?.url, 120)} alt="" className="size-16 shrink-0 rounded-lg bg-ink-50 object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-medium">{i.product?.name ?? 'Unavailable product'}</p>
                    <p className="text-sm text-ink-500">Qty {i.quantity}</p>
                    {i.issueMessage && <p role="alert" className="text-sm font-medium text-danger-600">{i.issueMessage}</p>}
                  </div>
                  {!i.issue && <p className="font-semibold">{formatPrice(i.lineTotal)}</p>}
                </li>
              ))}
            </ul>
            {!checkout.canCheckout && <Button as={Link} to="/cart" variant="secondary" size="sm" className="mt-2">Back to cart to fix this</Button>}
          </section>
        </div>

        <aside className="lg:sticky lg:top-40 lg:self-start">
          <OrderSummary summary={checkout.summary} shipments={checkout.shipments}>
            <Button size="lg" className="w-full" onClick={handlePlaceOrder} loading={placing} disabled={!canPlace}>
              Place order · {formatPrice(checkout.summary.total)}
            </Button>
            <p className="mt-3 text-center text-xs text-ink-500">The final amount is calculated again by our server when you place the order.</p>
          </OrderSummary>
        </aside>
      </div>
    </div>
  );
}
