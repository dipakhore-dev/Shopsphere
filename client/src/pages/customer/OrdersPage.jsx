import { Link, useSearchParams } from 'react-router-dom';
import { PackageOpen } from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import OrderStatusBadge from '../../components/common/OrderStatusBadge.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import SafeImage from '../../components/common/SafeImage.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listMyOrders } from '../../services/order.service.js';
import { formatDate } from '../../utils/format.js';
import { optimizeImageUrl } from '../../utils/images.js';
import { formatPrice } from '../../utils/money.js';
import { FILTERABLE_STATUSES, statusLabel } from '../../utils/orderStatus.js';

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const { status: loadStatus, data, error, reload } = useAsync(
    (signal) => listMyOrders({ page, limit: 10, ...(status ? { status } : {}) }, signal),
    [page, status],
  );

  const setParam = (changes) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setSearchParams(next);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">My orders</h1>
        <label className="flex items-center gap-2 text-sm">
          <span>Status</span>
          <select value={status} onChange={(e) => setParam({ status: e.target.value })} className="h-10 rounded-lg border border-ink-300 bg-white px-2 text-sm">
            <option value="">All orders</option>
            {FILTERABLE_STATUSES.map((s) => (<option key={s} value={s}>{statusLabel(s)}</option>))}
          </select>
        </label>
      </div>

      <div className="mt-6">
        {loadStatus === 'error' ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loadStatus === 'loading' && !data ? (
          <div className="h-48 animate-pulse rounded-2xl bg-ink-100" role="status" aria-label="Loading orders" />
        ) : data.orders.length === 0 ? (
          <EmptyState icon={PackageOpen} title="No orders found" action={<Button as={Link} to="/products">Start shopping</Button>}>
            {status ? 'No orders have this status.' : 'When you place an order it will show up here.'}
          </EmptyState>
        ) : (
          <ul className="space-y-4">
            {data.orders.map((o) => {
              const items = o.shipments.flatMap((s) => s.items);
              return (
                <li key={o.id} className="rounded-2xl border border-ink-100 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">Order {o.orderNumber}</p>
                      <p className="text-sm text-ink-500">Placed {formatDate(o.placedAt)} · {items.reduce((n, i) => n + i.quantity, 0)} items</p>
                    </div>
                    <div className="text-right">
                      <OrderStatusBadge status={o.status} />
                      <p className="mt-1 font-bold">{formatPrice(o.total)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <ul className="flex -space-x-2" aria-label="Items in this order">
                      {items.slice(0, 5).map((i) => (
                        <li key={`${i.productId}-${i.name}`}><SafeImage src={optimizeImageUrl(i.image, 96)} alt={i.name} className="size-12 rounded-lg border-2 border-white bg-ink-100 object-cover" /></li>
                      ))}
                      {items.length > 5 && <li className="flex size-12 items-center justify-center rounded-lg border-2 border-white bg-ink-100 text-xs font-semibold">+{items.length - 5}</li>}
                    </ul>
                    <Button as={Link} to={`/orders/${o.id}`} variant="secondary" size="sm">View details</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {data && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={(p) => setParam({ page: String(p) })} />}
      </div>
    </div>
  );
}
