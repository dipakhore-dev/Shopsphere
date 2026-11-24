import { Product } from '../models/Product.js';
import { Wishlist } from '../models/Wishlist.js';
import { ApiError } from '../utils/ApiError.js';
import { MAX_WISHLIST_ITEMS, MODERATION_STATUS, PRODUCT_STATUS } from '../utils/constants.js';

const VISIBLE = { status: PRODUCT_STATUS.ACTIVE, moderationStatus: MODERATION_STATUS.APPROVED };

export async function getWishlistIds(userId) {
  const wl = await Wishlist.findOne({ user: userId }).lean();
  return (wl?.products ?? []).map(String);
}

/** Newest first. Products that were hidden or deleted since being saved are not shown. */
export async function getWishlistProducts(userId) {
  const ids = await getWishlistIds(userId);
  if (ids.length === 0) return [];

  const products = await Product.find({ _id: { $in: ids }, ...VISIBLE })
    .select('-description -specifications -tags -searchName')
    .populate([{ path: 'category', select: 'name slug' }, { path: 'store', select: 'storeName slug' }])
    .lean();

  const byId = new Map(products.map((p) => [String(p._id), p]));
  return [...ids].reverse().map((id) => byId.get(id)).filter(Boolean);
}

export async function addToWishlist(userId, productId) {
  if (!(await Product.exists({ _id: productId, ...VISIBLE }))) throw ApiError.notFound('This product is not available');

  const current = await Wishlist.findOne({ user: userId }).select('products').lean();
  const already = current?.products?.some((p) => String(p) === String(productId));
  if (!already && (current?.products?.length ?? 0) >= MAX_WISHLIST_ITEMS) {
    throw ApiError.conflict(`Your wishlist can hold at most ${MAX_WISHLIST_ITEMS} products`);
  }

  // $addToSet makes this idempotent: adding twice is the same as adding once.
  await Wishlist.updateOne({ user: userId }, { $addToSet: { products: productId } }, { upsert: true });
}

export async function removeFromWishlist(userId, productId) {
  await Wishlist.updateOne({ user: userId }, { $pull: { products: productId } });
}
