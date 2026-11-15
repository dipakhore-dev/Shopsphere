import * as productService from '../services/product.service.js';
import { deleteImages, sellerImageFolder, uploadImage } from '../services/imageStorage.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { detectImageType } from '../utils/imageType.js';
import { serializeProduct } from '../utils/serializers.js';

export const listMyProducts = asyncHandler(async (req, res) => {
  const { products, meta } = await productService.listSellerProducts(req.user, req.query);
  sendSuccess(res, {
    data: { products: products.map((p) => serializeProduct(p, { view: 'seller', detail: false })) },
    meta,
  });
});

export const getMyProduct = asyncHandler(async (req, res) => {
  const product = await productService.getOwnedProduct(req.user, req.params.id);
  sendSuccess(res, { data: { product: serializeProduct(product, { view: 'seller' }) } });
});

/** Step 1 of creating/editing a product: upload files, get back { url, publicId } pairs. */
export const uploadProductImages = asyncHandler(async (req, res) => {
  const files = req.files ?? [];
  if (files.length === 0) throw ApiError.badRequest('Attach at least one image in the "images" field');

  // multer trusted the Content-Type header; here we check the actual bytes.
  for (const file of files) {
    if (detectImageType(file.buffer) !== file.mimetype) {
      throw ApiError.badRequest(`"${file.originalname}" is not a valid JPEG, PNG or WebP image`);
    }
  }

  const folder = sellerImageFolder(req.user._id);
  const results = await Promise.allSettled(files.map((f) => uploadImage(f.buffer, { folder })));

  const uploaded = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const failed = results.find((r) => r.status === 'rejected');

  if (failed) {
    await deleteImages(uploaded.map((u) => u.publicId)); // do not leave half a batch behind
    throw failed.reason instanceof ApiError ? failed.reason : new ApiError(502, 'Image upload failed. Please try again.');
  }

  sendSuccess(res, { statusCode: 201, message: 'Images uploaded', data: { images: uploaded } });
});
