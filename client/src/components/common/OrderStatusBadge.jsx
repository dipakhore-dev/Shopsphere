import { STATUS_META } from '../../utils/orderStatus.js';
import { cn } from '../../utils/cn.js';

export default function OrderStatusBadge({ status, className }) {
  const meta = STATUS_META[status] ?? { label: status, tone: 'bg-ink-100 text-ink-700' };
  return <span className={cn('inline-block rounded-full px-2.5 py-1 text-xs font-semibold', meta.tone, className)}>{meta.label}</span>;
}
