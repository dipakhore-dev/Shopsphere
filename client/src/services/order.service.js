import api from './api.js';

/** Server-calculated totals for the cart (or a single Buy Now product). */
export const previewCheckout = (buyNow, signal) =>
  api.post('/orders/preview', buyNow ? { buyNow } : {}, { signal }).then((res) => res.data.data.checkout);

/**
 * `idempotencyKey` identifies ONE purchase attempt. Re-sending the same key (double click,
 * flaky network, retry) can never create a second order.
 */
export const placeOrder = (payload, idempotencyKey) =>
  api.post('/orders', payload, { headers: { 'Idempotency-Key': idempotencyKey } }).then((res) => res.data.data.order);

export const listMyOrders = (params, signal) =>
  api.get('/orders/my', { params, signal }).then((res) => ({ orders: res.data.data.orders, meta: res.data.meta }));

export const getOrder = (id, signal) => api.get(`/orders/${id}`, { signal }).then((res) => res.data.data.order);
export const cancelOrder = (id, reason) => api.patch(`/orders/${id}/cancel`, reason ? { reason } : {}).then((res) => res.data.data.order);
