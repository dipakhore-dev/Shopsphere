import { Link, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import OrderStatusBadge from '../../components/common/OrderStatusBadge.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { getOrder } from '../../services/order.service.js';
import { formatDateTime } from '../../utils/format.js';
import { PROGRESS_STEPS, statusLabel } from '../../utils/orderStatus.js';
import { cn } from '../../utils/cn.js';

function Stepper({ status }) {
  if (status === 'cancelled') return <p role="status" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-danger-600">This shipment was cancelled.</p>;
  const current = PROGRESS_STEPS.indexOf(status);

  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Shipment progress">
      {PROGRESS_STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <li key={step} className="flex flex-col items-center text-center" aria-current={i === current ? 'step' : undefined}>
            <span className={cn('flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold', done ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300 bg-white text-ink-500')}>
              {done ? <Check className="size-4" aria-hidden="true" /> : i + 1}
            </span>
            <span className={cn('mt-1.5 text-[11px] leading-tight sm:text-xs', done ? 'font-semibold text-ink-900' : 'text-ink-500')}>{statusLabel(step)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function OrderTrackingPage() {
  const { id } = useParams();
  const { status, data: order, error, reload } = useAsync((signal) => getOrder(id, signal), [id]);

  if (status === 'loading' && !order) return <div className="flex min-h-[50vh] items-center justify-center text-brand-600"><Spinner className="size-8" label="Loading tracking" /></div>;
  if (status === 'error') return <div className="mx-auto max-w-3xl px-4 py-12"><ErrorState message={error} onRetry={reload} /></div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-ink-500"><Link to="/orders" className="hover:text-brand-700">My orders</Link> / <Link to={`/orders/${order.id}`} className="hover:text-brand-700">{order.orderNumber}</Link> / <span className="text-ink-900">Tracking</span></nav>
      <h1 className="text-3xl font-bold">Track order {order.orderNumber}</h1>
      <p className="mt-1 text-sm text-ink-500">Each seller ships separately, so every shipment has its own progress.</p>

      <div className="mt-6 space-y-6">
        {order.shipments.map((s) => (
          <section key={s.id} aria-label={`Shipment from ${s.store.storeName}`} className="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">Sold by {s.store.storeName}</p>
                <p className="text-sm text-ink-500">{s.items.map((i) => `${i.quantity} x ${i.name}`).join(', ')}</p>
              </div>
              <OrderStatusBadge status={s.status} />
            </div>
            <Stepper status={s.status} />
            <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-ink-500">History</h2>
            <ol className="space-y-3 border-l-2 border-ink-100 pl-4">
              {[...s.statusHistory].reverse().map((h, i) => (
                <li key={`${h.status}-${h.at}-${i}`} className="relative">
                  <span className="absolute -left-[1.4rem] top-1.5 size-2.5 rounded-full bg-brand-600" aria-hidden="true" />
                  <p className="text-sm font-semibold">{statusLabel(h.status)}</p>
                  <p className="text-xs text-ink-500">{formatDateTime(h.at)}{h.note ? ` · ${h.note}` : ''}</p>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <Button as={Link} to={`/orders/${order.id}`} variant="secondary" className="mt-6">Back to order</Button>
    </div>
  );
}
