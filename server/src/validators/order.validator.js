import { z } from 'zod';
import { CART_LIMITS, ORDER_STATUS_VALUES } from '../utils/constants.js';
import { objectId, optionalQuery } from './common.validator.js';

const buyNow = z.object({
  productId: objectId,
  quantity: z.number().int().min(1).max(CART_LIMITS.MAX_QTY_PER_ITEM),
});

// NOTE: there is deliberately NO price, total, discount or shipping field. The server calculates them all.
export const createOrderSchema = z.object({
  addressId: objectId,
  // 'razorpay' is added in Phase 7 together with the payment flow.
  paymentMethod: z.enum(['cod'], { errorMap: () => ({ message: 'This payment method is not available yet' }) }),
  buyNow: buyNow.optional(),
});

export const previewSchema = z.object({ buyNow: buyNow.optional() });

export const cancelOrderSchema = z.object({
  reason: z.string().trim().max(300).refine((v) => !/[<>]/.test(v), 'Reason cannot contain < or >').optional(),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  status: optionalQuery(z.enum(ORDER_STATUS_VALUES)),
});
