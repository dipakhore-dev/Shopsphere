import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { getOrder } from '../../services/order.service.js';
import { formatPrice } from '../../utils/money.js';

/** Where checkout ends. Cash on delivery lands here now; online payments (Phase 7) reuse it. */
export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const orderId = params.get('order');
  const failed = params.get('status') === 'failed';
  const { status, data: order, error, reload } = useAsync((signal) => (orderId ? getOrder(orderId, signal) : Promise.resolve(null)), [orderId]);

  if (!orderId) return <div className="mx-auto max-w-xl px-4 py-16 text-center"><h1 className="text-3xl font-bold">No order to show</h1><Button as={Link} to="/orders" className="mt-6">My orders</Button></div>;
  if (status === 'loading') return <div className="flex min-h-[50vh] items-center justify-center text-brand-600"><Spinner className="size-8" label="Loading your order" /></div>;
  if (status === 'error') return <div className="mx-auto max-w-xl px-4 py-12"><ErrorState message={error} onRetry={reload} /></div>;

  return (
    <div className="mx-auto max-w-xl px-4 py-14 text-center">
      {failed ? <XCircle className="mx-auto size-14 text-danger-600" aria-hidden="true" /> : <CheckCircle2 className="mx-auto size-14 text-success-600" aria-hidden="true" />}
      <h1 className="mt-4 text-3xl font-bold">{failed ? 'Payment was not completed' : 'Thank you! Your order is placed'}</h1>
      <p className="mt-2 text-ink-700" role="status">
        Order <strong>{order.orderNumber}</strong>
        {order.paymentMethod === 'cod' && !failed && <> will be delivered to {order.shippingAddress.city}. Please keep <strong>{formatPrice(order.total)}</strong> ready to pay in cash.</>}
      </p>
      <p className="mt-1 text-sm text-ink-500">We have emailed you the details.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button as={Link} to={`/orders/${order.id}`}>View order</Button>
        <Button as={Link} to="/products" variant="secondary">Continue shopping</Button>
      </div>
    </div>
  );
}
