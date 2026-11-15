import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { MODERATION_STATUS, PRODUCT_STATUS } from '../utils/constants.js';
import { buildPageMeta } from '../utils/pagination.js';
import { escapeRegex } from '../utils/text.js';
import { sellerImageFolder } from './imageStorage.service.js';

const VISIBLE = Object.freeze({ status: PRODUCT_STATUS.ACTIVE, moderationStatus: MODERATION_STATUS.APPROVED });

const POPULATE = [
  { path: 'category', select: 'name slug' },
  { path: 'store', select: 'storeName slug' },
];

// Listing cards do not need the long description or the specification table.
const CARD_FIELDS = '-description -specifications -tags -searchName';

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  price_asc: { finalPrice: 1, _id: 1 },
  price_desc: { finalPrice: -1, _id: 1 },
  rating: { averageRating: -1, reviewCount: -1, _id: 1 },
  popularity: { soldCount: -1, _id: 1 },
};
// _id is always the last sort key so pages never repeat or skip items when values tie.

// ---------- public catalogue ----------

export async function listPublic(query) {
  const { page, limit, q, category, minPrice, maxPrice, minRating, inStock } = query;
  const filter = { ...VISIBLE };

  if (category) {
    const found = await Category.findOne({ slug: category, isActive: true }).select('_id').lean();
    if (!found) return { products: [], meta: buildPageMeta({ page, limit, total: 0 }) };
    filter.category = found._id;
  }
  if (q) filter.$text = { $search: q };

  if (minPrice != null || maxPrice != null) {
    filter.finalPrice = {};
    if (minPrice != null) filter.finalPrice.$gte = minPrice;
    if (maxPrice != null) filter.finalPrice.$lte = maxPrice;
  }
  if (minRating != null) filter.averageRating = { $gte: minRating };
  if (inStock === true) filter.stock = { $gt: 0 };

  const sortKey = query.sort ?? (q ? 'relevance' : 'newest');
  const useRelevance = Boolean(q) && sortKey === 'relevance';
  const sort = useRelevance ? { score: { $meta: 'textScore' }, _id: 1 } : SORTS[sortKey === 'relevance' ? 'newest' : sortKey];

  let find = Product.find(filter);
  find = useRelevance ? find.select({ score: { $meta: 'textScore' } }).select(CARD_FIELDS) : find.select(CARD_FIELDS);

  const [docs, total] = await Promise.all([
    find
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(POPULATE)
      .lean(),
    Product.countDocuments(filter),
  ]);

  return { products: docs, meta: buildPageMeta({ page, limit, total }) };
}

export async function getPublicById(id) {
  const product = await Product.findOne({ _id: id, ...VISIBLE }).populate(POPULATE).lean();
  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

/** Search-as-you-type: products whose name STARTS WITH the text, plus matching categories. */
export async function suggest(q) {
  const prefix = new RegExp(`^${escapeRegex(q.toLowerCase())}`);

  const [products, categories] = await Promise.all([
    Product.find({ ...VISIBLE, searchName: prefix })
      .select('name finalPrice images')
      .sort({ soldCount: -1, _id: 1 })
      .limit(6)
      .lean(),
    Category.find({ isActive: true, name: new RegExp(`^${escapeRegex(q)}`, 'i') })
      .select('name slug')
      .limit(3)
      .lean(),
  ]);

  return { products, categories };
}

// ---------- seller operations ----------

async function assertCategoryUsable(categoryId) {
  const ok = await Category.exists({ _id: categoryId, isActive: true });
  if (!ok) throw ApiError.badRequest('Selected category does not exist');
}

/** Image ids contain the owner's user id, so a seller cannot attach someone else's uploads. */
function assertImagesOwnedBy(userId, images) {
  const prefix = `${sellerImageFolder(userId)}/`;
  if (images.some((img) => !img.publicId.startsWith(prefix))) {
    throw ApiError.badRequest('One or more images do not belong to your account');
  }
}

const populateOne = (doc) => doc.populate(POPULATE);

export async function createProduct(user, storeProfile, data) {
  await assertCategoryUsable(data.category);
  assertImagesOwnedBy(user._id, data.images);

  const { discountPrice, ...rest } = data;
  const product = await Product.create({
    ...rest,
    ...(discountPrice != null ? { discountPrice } : {}),
    seller: user._id, // always from the session, never from the request body
    store: storeProfile._id,
  });
  return populateOne(product);
}

/** The ownership filter IS the authorization: someone else's product simply "does not exist". */
async function findOwned(userId, productId) {
  const product = await Product.findOne({
    _id: productId,
    seller: userId,
    status: { $ne: PRODUCT_STATUS.DELETED },
  });
  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

export async function updateProduct(user, productId, data) {
  const product = await findOwned(user._id, productId);

  if (product.moderationStatus === MODERATION_STATUS.REMOVED) {
    throw ApiError.forbidden('This product was removed by an administrator', 'PRODUCT_REMOVED');
  }
  if (data.category) await assertCategoryUsable(data.category);
  if (data.images) assertImagesOwnedBy(user._id, data.images);

  const changes = { ...data };
  if ('discountPrice' in changes && changes.discountPrice === null) changes.discountPrice = undefined; // clears it

  product.set(changes);
  await product.save(); // runs validators and recalculates finalPrice
  return populateOne(product);
}

/**
 * Soft delete: the document is kept so past orders, reviews and returns can still
 * refer to it (and its images still load in order history).
 */
export async function deleteProduct(user, productId) {
  const product = await findOwned(user._id, productId);
  product.status = PRODUCT_STATUS.DELETED;
  await product.save();
}

export async function getOwnedProduct(user, productId) {
  const product = await findOwned(user._id, productId);
  return populateOne(product);
}

export async function listSellerProducts(user, { page, limit, q, status }) {
  const filter = { seller: user._id, status: { $ne: PRODUCT_STATUS.DELETED } };
  if (status && status !== 'all') filter.status = status;
  if (q) filter.searchName = new RegExp(escapeRegex(q.toLowerCase()));

  const [products, total] = await Promise.all([
    Product.find(filter)
      .select('-description -specifications -searchName')
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(POPULATE)
      .lean(),
    Product.countDocuments(filter),
  ]);

  return { products, meta: buildPageMeta({ page, limit, total }) };
}
