import { Category } from '../models/Category.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { serializeCategory } from '../utils/serializers.js';

export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
  sendSuccess(res, { data: { categories: categories.map(serializeCategory) } });
});
