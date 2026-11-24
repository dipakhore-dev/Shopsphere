import { MODERATION_STATUS, PRODUCT_STATUS, SHIPPING } from '../utils/constants.js';

/**
 * ALL money maths lives here and is used by the cart, the checkout preview and
 * order creation, so the customer is shown exactly what they will be charged.
 * Everything is integer paise. The browser never supplies a price.
 */

export const ISSUE_MESSAGES = {
  UNAVAILABLE: (name) => `"${name}" is no longer available`,
  OWN_PRODUCT: (name) => `You cannot buy your own product "${name}"`,
  OUT_OF_STOCK: (name) => `"${name}" is out of stock`,
  INSUFFICIENT_STOCK: (name, stock) => `Only ${stock} of "${name}" left in stock`,
};

/** Why this cart line cannot be bought right now (null = fine). */
export function lineIssue(product, quantity, userId) {
  if (!product || product.status !== PRODUCT_STATUS.ACTIVE || product.moderationStatus !== MODERATION_STATUS.APPROVED) {
    return 'UNAVAILABLE';
  }
  if (String(product.seller) === String(userId)) return 'OWN_PRODUCT';
  if (product.stock <= 0) return 'OUT_OF_STOCK';
  if (quantity > product.stock) return 'INSUFFICIENT_STOCK';
  return null;
}

export function shippingFor(subtotal) {
  return subtotal === 0 || subtotal >= SHIPPING.FREE_ABOVE_PAISE ? 0 : SHIPPING.FLAT_FEE_PAISE;
}

/**
 * lines: [{ product, quantity }]  (product = lean doc with seller, store, price, finalPrice)
 * Groups by seller (each seller ships separately, so shipping is per seller).
 */
export function priceLines(lines) {
  const bySeller = new Map();

  for (const { product, quantity } of lines) {
    const key = String(product.seller);
    if (!bySeller.has(key)) {
      bySeller.set(key, { seller: product.seller, store: product.store, items: [], subtotal: 0, listedTotal: 0 });
    }
    const shipment = bySeller.get(key);
    const lineTotal = product.finalPrice * quantity;

    shipment.items.push({ product, quantity, unitPrice: product.price, unitFinalPrice: product.finalPrice, lineTotal });
    shipment.subtotal += lineTotal;
    shipment.listedTotal += product.price * quantity;
  }

  const shipments = [...bySeller.values()].map((s) => {
    const shippingFee = shippingFor(s.subtotal);
    return { ...s, shippingFee, total: s.subtotal + shippingFee };
  });

  const subtotal = shipments.reduce((sum, s) => sum + s.subtotal, 0);
  const listedTotal = shipments.reduce((sum, s) => sum + s.listedTotal, 0);
  const shippingTotal = shipments.reduce((sum, s) => sum + s.shippingFee, 0);

  return {
    shipments,
    summary: {
      itemCount: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal,
      discountTotal: listedTotal - subtotal,
      shippingTotal,
      total: subtotal + shippingTotal,
    },
  };
}
