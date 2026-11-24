import { z } from 'zod';
import { CART_LIMITS } from '../utils/constants.js';
import { objectId } from './common.validator.js';

const quantity = z.number().int('Quantity must be a whole number').min(1).max(CART_LIMITS.MAX_QTY_PER_ITEM);

export const addCartItemSchema = z.object({
  productId: objectId,
  quantity: quantity.default(1),
});

export const updateCartItemSchema = z.object({ quantity });
