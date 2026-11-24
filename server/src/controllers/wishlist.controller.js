import * as wishlistService from '../services/wishlist.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { serializeProduct } from '../utils/serializers.js';

export const getWishlist = asyncHandler(async (req, res) => {
  const products = await wishlistService.getWishlistProducts(req.user._id);
  sendSuccess(res, { data: { products: products.map((p) => serializeProduct(p, { detail: false })) } });
});

/** Just the ids: lets product cards show a filled heart without downloading whole products. */
export const getWishlistIds = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: { ids: await wishlistService.getWishlistIds(req.user._id) } });
});

export const addToWishlist = asyncHandler(async (req, res) => {
  await wishlistService.addToWishlist(req.user._id, req.params.productId);
  sendSuccess(res, { statusCode: 201, message: 'Saved to wishlist', data: { ids: await wishlistService.getWishlistIds(req.user._id) } });
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  await wishlistService.removeFromWishlist(req.user._id, req.params.productId);
  sendSuccess(res, { message: 'Removed from wishlist', data: { ids: await wishlistService.getWishlistIds(req.user._id) } });
});
