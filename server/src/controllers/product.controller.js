import * as productService from '../services/product.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { serializeProduct } from '../utils/serializers.js';

// ----- public -----

export const listProducts = asyncHandler(async (req, res) => {
  const { products, meta } = await productService.listPublic(req.query);
  sendSuccess(res, { data: { products: products.map((p) => serializeProduct(p, { detail: false })) }, meta });
});

export const suggestProducts = asyncHandler(async (req, res) => {
  const { products, categories } = await productService.suggest(req.query.q);
  sendSuccess(res, {
    data: {
      products: products.map((p) => ({
        id: String(p._id),
        name: p.name,
        finalPrice: p.finalPrice,
        image: p.images?.[0]?.url ?? null,
      })),
      categories: categories.map((c) => ({ id: String(c._id), name: c.name, slug: c.slug })),
    },
  });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getPublicById(req.params.id);
  sendSuccess(res, { data: { product: serializeProduct(product) } });
});

// ----- seller (requires authenticate + authorize('seller') + requireApprovedSeller) -----

export const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.user, req.sellerProfile, req.body);
  sendSuccess(res, {
    statusCode: 201,
    message: 'Product created',
    data: { product: serializeProduct(product, { view: 'seller' }) },
  });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.user, req.params.id, req.body);
  sendSuccess(res, { message: 'Product updated', data: { product: serializeProduct(product, { view: 'seller' }) } });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.user, req.params.id);
  sendSuccess(res, { message: 'Product deleted' });
});
