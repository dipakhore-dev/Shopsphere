import * as orderService from '../services/order.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { serializeOrder } from '../utils/serializers.js';

export const previewCheckout = asyncHandler(async (req, res) => {
  const preview = await orderService.previewCheckout(req.user, req.body.buyNow);
  sendSuccess(res, { data: { checkout: preview } });
});

export const createOrder = asyncHandler(async (req, res) => {
  const { order, sellerOrders, replay } = await orderService.createOrder(req.user, req.body, req.idempotencyKey);
  sendSuccess(res, {
    // 201 = created now, 200 = this exact request had already succeeded earlier
    statusCode: replay ? 200 : 201,
    message: replay ? 'Order was already placed' : 'Order placed',
    data: { order: serializeOrder(order, sellerOrders), idempotentReplay: replay },
  });
});

export const listMyOrders = asyncHandler(async (req, res) => {
  const { orders, meta } = await orderService.listMyOrders(req.user, req.query);
  sendSuccess(res, { data: { orders: orders.map((o) => serializeOrder(o.order, o.shipments)) }, meta });
});

export const getMyOrder = asyncHandler(async (req, res) => {
  const { order, shipments } = await orderService.getMyOrder(req.user, req.params.id);
  sendSuccess(res, { data: { order: serializeOrder(order, shipments) } });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const { order, shipments } = await orderService.cancelOrder(req.user, req.params.id, req.body.reason);
  sendSuccess(res, { message: 'Order cancelled', data: { order: serializeOrder(order, shipments) } });
});
