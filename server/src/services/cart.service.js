import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { CART_LIMITS, MODERATION_STATUS, PRODUCT_STATUS } from '../utils/constants.js';
import { serializeProduct } from '../utils/serializers.js';
import { ISSUE_MESSAGES, lineIssue, priceLines } from './pricing.service.js';

const VISIBLE = { status: PRODUCT_STATUS.ACTIVE, moderationStatus: MODERATION_STATUS.APPROVED };
const CART_PRODUCT_FIELDS = '-description -specifications -tags -searchName';

/**
 * Builds what the customer sees for a list of { product, quantity } (cart or Buy Now):
 * live prices, stock problems and server-calculated totals.
 */
export async function buildCheckoutView(userId, rawItems) {
  const ids = rawItems.map((i) => i.product);
  const products = ids.length
    ? await Product.find({ _id: { $in: ids } })
        .select(CART_PRODUCT_FIELDS)
        .populate([{ path: 'category', select: 'name slug' }, { path: 'store', select: 'storeName slug' }])
        .lean()
    : [];
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const items = [];
  const purchasable = [];

  for (const raw of rawItems) {
    const product = byId.get(String(raw.product));
    const issue = lineIssue(product, raw.quantity, userId);
    if (!issue) purchasable.push({ product, quantity: raw.quantity });

    items.push({
      productId: String(raw.product),
      quantity: raw.quantity,
      issue,
      issueMessage: issue && product ? ISSUE_MESSAGES[issue](product.name, product.stock) : issue ? 'This product is no longer available' : null,
      availableStock: product?.stock ?? 0,
      lineTotal: issue ? 0 : product.finalPrice * raw.quantity,
      product: product ? serializeProduct(product, { detail: false }) : null,
    });
  }

  const { shipments, summary } = priceLines(purchasable);

  return {
    items,
    shipments: shipments.map((s) => ({
      store: { id: String(s.store._id ?? s.store), storeName: s.store.storeName ?? null },
      itemCount: s.items.reduce((n, i) => n + i.quantity, 0),
      subtotal: s.subtotal,
      shippingFee: s.shippingFee,
      total: s.total,
    })),
    summary,
    // Only when every line can be bought can the customer proceed.
    canCheckout: items.length > 0 && items.every((i) => !i.issue),
  };
}

async function getOrCreateCart(userId) {
  try {
    return await Cart.findOneAndUpdate({ user: userId }, { $setOnInsert: { user: userId, items: [] } }, { upsert: true, new: true });
  } catch (err) {
    if (err?.code === 11000) return Cart.findOne({ user: userId }); // lost a creation race: it exists now
    throw err;
  }
}

export async function getCartView(userId) {
  const cart = await Cart.findOne({ user: userId }).lean();
  return buildCheckoutView(userId, cart?.items ?? []);
}

async function requirePurchasable(userId, productId) {
  const product = await Product.findOne({ _id: productId, ...VISIBLE }).select('name seller stock').lean();
  if (!product) throw ApiError.notFound('This product is not available');
  if (String(product.seller) === String(userId)) {
    throw ApiError.badRequest('You cannot buy your own product', 'OWN_PRODUCT');
  }
  return product;
}

function assertQuantityAllowed(product, quantity) {
  if (quantity > CART_LIMITS.MAX_QTY_PER_ITEM) {
    throw ApiError.conflict(`You can order at most ${CART_LIMITS.MAX_QTY_PER_ITEM} of one product`, 'MAX_QUANTITY');
  }
  if (quantity > product.stock) {
    throw ApiError.conflict(
      product.stock === 0 ? `"${product.name}" is out of stock` : `Only ${product.stock} of "${product.name}" left in stock`,
      'INSUFFICIENT_STOCK',
    );
  }
}

/**
 * Adds to the quantity already in the cart. Every write is ONE atomic MongoDB update
 * ($inc / $push with a guard), so five clicks at the same instant add exactly five.
 */
export async function addItem(userId, productId, quantity) {
  const product = await requirePurchasable(userId, productId);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const cart = await getOrCreateCart(userId);
    const existing = cart.items.find((i) => String(i.product) === String(productId));

    if (existing) {
      // The limit is part of the filter, so the check and the increment cannot be separated by another request.
      const limit = Math.min(CART_LIMITS.MAX_QTY_PER_ITEM, product.stock);
      const result = await Cart.updateOne(
        { _id: cart._id, items: { $elemMatch: { product: productId, quantity: { $lte: limit - quantity } } } },
        { $inc: { 'items.$.quantity': quantity } },
      );
      if (result.matchedCount === 1) return getCartView(userId);
      assertQuantityAllowed(product, existing.quantity + quantity); // throws the right message when over the limit
    } else {
      if (cart.items.length >= CART_LIMITS.MAX_DISTINCT_ITEMS) {
        throw ApiError.conflict(`Your cart can hold at most ${CART_LIMITS.MAX_DISTINCT_ITEMS} different products`);
      }
      assertQuantityAllowed(product, quantity);
      // The $ne guard prevents a duplicate line when the same product is added twice at the same instant;
      // the loser simply loops and takes the $inc branch above.
      const result = await Cart.updateOne(
        { _id: cart._id, 'items.product': { $ne: productId } },
        { $push: { items: { product: productId, quantity } } },
      );
      if (result.matchedCount === 1) return getCartView(userId);
    }
  }
  throw ApiError.conflict('Your cart is busy. Please try again.');
}

/** Sets the quantity to an exact number. */
export async function setQuantity(userId, productId, quantity) {
  const product = await requirePurchasable(userId, productId);
  assertQuantityAllowed(product, quantity);

  const result = await Cart.updateOne({ user: userId, 'items.product': productId }, { $set: { 'items.$.quantity': quantity } });
  if (result.matchedCount === 0) throw ApiError.notFound('That product is not in your cart');
  return getCartView(userId);
}

export async function removeItem(userId, productId) {
  await Cart.updateOne({ user: userId }, { $pull: { items: { product: productId } } });
  return getCartView(userId);
}

export async function clearCart(userId) {
  await Cart.updateOne({ user: userId }, { $set: { items: [] } });
  return getCartView(userId);
}
