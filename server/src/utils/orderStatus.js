import { ORDER_PROGRESS, ORDER_STATUS } from './constants.js';

/**
 * The parent order's status is derived from its seller shipments:
 *  - every shipment cancelled      -> cancelled
 *  - otherwise the LEAST advanced shipment that is still active
 *    (one shipped + one still confirmed -> "confirmed")
 */
export function deriveOrderStatus(shipmentStatuses) {
  const active = shipmentStatuses.filter((s) => s !== ORDER_STATUS.CANCELLED);
  if (active.length === 0) return ORDER_STATUS.CANCELLED;

  const onProgressPath = active.filter((s) => ORDER_PROGRESS.includes(s));
  if (onProgressPath.length === active.length) {
    return active.reduce((least, s) => (ORDER_PROGRESS.indexOf(s) < ORDER_PROGRESS.indexOf(least) ? s : least));
  }
  // returned / refunded shipments: report the furthest post-delivery state
  return active.includes(ORDER_STATUS.REFUNDED) && active.every((s) => s === ORDER_STATUS.REFUNDED)
    ? ORDER_STATUS.REFUNDED
    : ORDER_STATUS.RETURNED;
}
