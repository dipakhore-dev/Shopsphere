// Literal class names so Tailwind can see them.
const TONES = {
  amber: 'bg-amber-100 text-amber-800',
  blue: 'bg-blue-100 text-blue-800',
  teal: 'bg-brand-50 text-brand-700',
  green: 'bg-green-100 text-success-600',
  red: 'bg-red-100 text-danger-600',
  gray: 'bg-ink-100 text-ink-700',
};

export const STATUS_META = {
  pending: { label: 'Pending', tone: TONES.amber },
  confirmed: { label: 'Confirmed', tone: TONES.blue },
  processing: { label: 'Processing', tone: TONES.blue },
  shipped: { label: 'Shipped', tone: TONES.teal },
  out_for_delivery: { label: 'Out for delivery', tone: TONES.teal },
  delivered: { label: 'Delivered', tone: TONES.green },
  cancelled: { label: 'Cancelled', tone: TONES.red },
  returned: { label: 'Returned', tone: TONES.gray },
  refunded: { label: 'Refunded', tone: TONES.gray },
};

export const statusLabel = (status) => STATUS_META[status]?.label ?? status;

/** Steps shown on the tracking page. */
export const PROGRESS_STEPS = ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];

export const FILTERABLE_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
