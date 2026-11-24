import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPinned } from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import OrderStatusBadge from '../../components/common/OrderStatusBadge.jsx';
import SafeImage from '../../components/common/SafeImage.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { formatAddressLines } from '../../components/shop/AddressCard.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { cancelOrder, getOrder } from '../../services/order.service.js';
import { getErrorMessage } from '../../utils/errors.js';
import { formatDateTime } from '../../utils/format.js';
import { optimizeImageUrl } from '../../utils/images.js';
import { formatPrice } from '../../utils/money.js';

export default function OrderDetailsPage() {
  const { id } = useParams();
  const { status, data: order, error, httpStatus, reload } = useAsync((signal) => getOrder(id, signal), [id]);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCancel = async () => {
    setBusy(true);
    try {
      await cancelOrder(id, reason.trim());
      toast.success('Order cancelled');
      setConfirming(false);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setConfirming(false);
      reload();
    } finally {
      setBusy(false);
    }
  };

  if (status === 'loading' && !order) return <div className="flex min-h-[50vh] items-center justify-center text-brand-600"><Spinner className="size-8" label="Loading order" /></div>;
  if (status === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        {httpStatus === 404 || httpStatus === 400 ? (
          <div className="text-center"><h1 className="text-3xl font-bold">Order not found</h1><Button as={Link} to="/orders" className="mt-6">My orders</Button></div>
        ) : <ErrorState message={error} onRetry={reload} />}
      </div>
    );
  }

  const card = 'rounded-2xl border border-ink-100 bg-white p-5';
  const a = order.shippingAddress;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-ink-500"><Link to="/orders" className="hover:text-brand-700">My orders</Link> / <span className="text-ink-900">{order.orderNumber}</span></nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Order {order.orderNumber}</h1>
          <p className="mt-1 text-sm text-ink-500">Placed {formatDateTime(order.placedAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <OrderStatusBadge status={order.status} className="text-sm" />
          <Button as={Link} to={`/orders/${order.id}/tracking`} variant="secondary" size="sm"><MapPinned className="size-4" aria-hidden="true" /> Track</Button>
          {order.canCancel && <Button variant="dangerGhost" size="sm" onClick={() => setConfirming(true)}>Cancel order</Button>}
        </div>
      </div>

      {order.status === 'cancelled' && (
        <p role="status" className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-danger-600">
          This order was cancelled{order.cancelledAt ? ` on ${formatDateTime(order.cancelledAt)}` : ''}{order.cancellationReason ? `: ${order.cancellationReason}` : '.'}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          {order.shipments.map((s) => (
            <section key={s.id} aria-label={`Shipment from ${s.store.storeName}`} className={card}>
              <div className="flex items-center justify-between gap-3 border-b border-ink-100 pb-3">
                <p className="font-semibold">Sold by {s.store.storeName}</p>
                <OrderStatusBadge status={s.status} />
              </div>
              <ul className="divide-y divide-ink-100">
                {s.items.map((i) => (
                  <li key={`${s.id}-${i.productId}`} className="flex gap-4 py-3">
                    <SafeImage src={optimizeImageUrl(i.image, 120)} alt="" className="size-16 shrink-0 rounded-lg bg-ink-50 object-cover" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/products/${i.productId}`} className="line-clamp-2 font-medium hover:text-brand-700">{i.name}</Link>
                      <p className="text-sm text-ink-500">{i.quantity} x {formatPrice(i.unitFinalPrice)}</p>
                    </div>
                    <p className="font-semibold">{formatPrice(i.lineTotal)}</p>
                  </li>
                ))}
              </ul>
              <p className="border-t border-ink-100 pt-3 text-right text-sm text-ink-700">Delivery {s.shippingFee === 0 ? 'free' : formatPrice(s.shippingFee)} · Shipment total <strong>{formatPrice(s.total)}</strong></p>
            </section>
          ))}
        </div>

        <aside className="space-y-4">
          <section className={card} aria-labelledby="addr-h">
            <h2 id="addr-h" className="font-bold">Delivery address</h2>
            <address className="mt-2 text-sm not-italic leading-relaxed text-ink-700">
              <strong className="block text-ink-900">{a.fullName}</strong>
              {formatAddressLines(a).map((l) => (<span key={l} className="block">{l}</span>))}
              <span className="block">Mobile: {a.phone}</span>
            </address>
          </section>
          <section className={card} aria-labelledby="pay-h">
            <h2 id="pay-h" className="font-bold">Payment</h2>
            <p className="mt-2 text-sm text-ink-700">{order.paymentMethod === 'cod' ? 'Cash on delivery' : 'Online payment'}</p>
            <dl className="mt-3 space-y-2 border-t border-ink-100 pt-3 text-sm">
              <div className="flex justify-between"><dt>Items</dt><dd>{formatPrice(order.subtotal + order.discountTotal)}</dd></div>
              {order.discountTotal > 0 && <div className="flex justify-between text-success-600"><dt>Discount</dt><dd>- {formatPrice(order.discountTotal)}</dd></div>}
              <div className="flex justify-between"><dt>Delivery</dt><dd>{order.shippingTotal === 0 ? 'Free' : formatPrice(order.shippingTotal)}</dd></div>
              <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-bold"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
            </dl>
          </section>
        </aside>
      </div>

      <ConfirmDialog open={confirming} title="Cancel this order?" message="Items go back on sale and you will not be charged. This cannot be undone." confirmLabel="Yes, cancel order" danger loading={busy} onConfirm={handleCancel} onCancel={() => setConfirming(false)}>
        <label className="mt-4 block text-sm font-medium">
          Reason (optional)
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" />
        </label>
      </ConfirmDialog>
    </div>
  );
}
