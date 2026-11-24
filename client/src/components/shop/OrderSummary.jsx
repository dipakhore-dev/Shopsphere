import { formatPrice } from '../../utils/money.js';

function Row({ label, value, strong = false, positive = false }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? 'border-t border-ink-100 pt-3 text-lg font-bold' : 'text-sm'}`}>
      <dt className={strong ? '' : 'text-ink-700'}>{label}</dt>
      <dd className={positive ? 'font-semibold text-success-600' : strong ? '' : 'font-medium'}>{value}</dd>
    </div>
  );
}

/** Totals as calculated by the SERVER (cart view or checkout preview). */
export default function OrderSummary({ summary, shipments = [], children }) {
  return (
    <section aria-labelledby="summary-heading" className="rounded-2xl border border-ink-100 bg-white p-5">
      <h2 id="summary-heading" className="text-xl font-bold">Order summary</h2>
      <dl className="mt-4 space-y-3">
        <Row label={`Items (${summary.itemCount})`} value={formatPrice(summary.subtotal + summary.discountTotal)} />
        {summary.discountTotal > 0 && <Row label="Discount" value={`- ${formatPrice(summary.discountTotal)}`} positive />}
        <Row label="Delivery" value={summary.shippingTotal === 0 ? 'Free' : formatPrice(summary.shippingTotal)} positive={summary.shippingTotal === 0} />
        <Row label="Total" value={formatPrice(summary.total)} strong />
      </dl>

      {shipments.length > 1 && (
        <p className="mt-4 rounded-lg bg-ink-50 p-3 text-xs text-ink-700">
          Your items ship from {shipments.length} sellers, so delivery is calculated per seller (free from Rs 500 each).
        </p>
      )}
      {summary.discountTotal > 0 && (
        <p className="mt-3 text-sm font-semibold text-success-600">You save {formatPrice(summary.discountTotal)} on this order</p>
      )}
      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}
