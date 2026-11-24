import * as cartService from '../services/cart.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

const respond = (res, cart, message = 'OK', statusCode = 200) => sendSuccess(res, { statusCode, message, data: { cart } });

export const getCart = asyncHandler(async (req, res) => respond(res, await cartService.getCartView(req.user._id)));

export const addItem = asyncHandler(async (req, res) =>
  respond(res, await cartService.addItem(req.user._id, req.body.productId, req.body.quantity), 'Added to cart', 201),
);

export const updateItem = asyncHandler(async (req, res) =>
  respond(res, await cartService.setQuantity(req.user._id, req.params.id, req.body.quantity), 'Cart updated'),
);

export const removeItem = asyncHandler(async (req, res) =>
  respond(res, await cartService.removeItem(req.user._id, req.params.id), 'Removed from cart'),
);

export const clearCart = asyncHandler(async (req, res) => respond(res, await cartService.clearCart(req.user._id), 'Cart cleared'));
