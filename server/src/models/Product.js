import mongoose from 'mongoose';
import {
  MAX_PRODUCT_IMAGES,
  MODERATION_STATUS,
  MODERATION_STATUS_VALUES,
  PRODUCT_STATUS,
  PRODUCT_STATUS_VALUES,
} from '../utils/constants.js';

const { Schema } = mongoose;

/**
 * MONEY: every price is stored as an INTEGER NUMBER OF PAISE (Rs 499.50 = 49950).
 * Floating-point rupees cause rounding errors (0.1 + 0.2 !== 0.3) which are
 * unacceptable once carts, GST and refunds are calculated. Razorpay also uses paise.
 */
const isInteger = { validator: Number.isInteger, message: '{PATH} must be a whole number of paise' };
const MAX_PRICE = 100_000_000; // Rs 10,00,000

const imageSchema = new Schema(
  {
    url: { type: String, required: true, maxlength: 500 },
    publicId: { type: String, maxlength: 200 }, // Cloudinary id (absent for seeded demo images)
  },
  { _id: false },
);

const specSchema = new Schema(
  {
    key: { type: String, required: true, trim: true, maxlength: 50 },
    value: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // owner, used for authorization
    store: { type: Schema.Types.ObjectId, ref: 'SellerProfile', required: true }, // shown to shoppers

    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 150 },
    searchName: { type: String }, // lower-cased copy of name, powers prefix suggestions
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 5000 },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: String, required: true, trim: true, maxlength: 60 },
    tags: [{ type: String, lowercase: true, trim: true, maxlength: 30 }],

    price: { type: Number, required: true, min: 100, max: MAX_PRICE, validate: isInteger },
    discountPrice: {
      type: Number,
      min: 100,
      validate: isInteger,
    },
    // What the customer actually pays per unit. Stored (not virtual) so it can be indexed and sorted on.
    finalPrice: { type: Number, required: true, min: 100 },

    stock: { type: Number, required: true, default: 0, min: 0, max: 100_000, validate: isInteger },
    lowStockThreshold: { type: Number, default: 5, min: 0, max: 1000 },

    images: {
      type: [imageSchema],
      validate: [
        (arr) => arr.length >= 1 && arr.length <= MAX_PRODUCT_IMAGES,
        `A product needs between 1 and ${MAX_PRODUCT_IMAGES} images`,
      ],
    },
    specifications: {
      type: [specSchema],
      validate: [(arr) => arr.length <= 20, 'A product can have at most 20 specifications'],
    },

    // Maintained by the system (reviews in Phase 4, orders in Phase 4), never by the seller.
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    soldCount: { type: Number, default: 0, min: 0 },

    status: { type: String, enum: PRODUCT_STATUS_VALUES, default: PRODUCT_STATUS.ACTIVE },
    moderationStatus: { type: String, enum: MODERATION_STATUS_VALUES, default: MODERATION_STATUS.APPROVED },
    moderationReason: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

productSchema.pre('validate', function derivedFields() {
  // Checked here (not in a field validator) so it also runs when only `price` changed.
  if (this.discountPrice != null && this.price != null && this.discountPrice >= this.price) {
    this.invalidate('discountPrice', 'Discount price must be lower than the price');
  }
  this.finalPrice = this.discountPrice != null ? this.discountPrice : this.price;
  if (this.name) this.searchName = this.name.toLowerCase();
});

// ---------- indexes ----------
// Full-text search. Weights make a match in the name worth more than one in the description.
productSchema.index(
  { name: 'text', brand: 'text', tags: 'text', description: 'text' },
  { weights: { name: 10, brand: 5, tags: 5, description: 1 }, name: 'product_text' },
);
// Marketplace listing: equality filters first (status, moderation), then category, then the sort key.
productSchema.index({ status: 1, moderationStatus: 1, category: 1, createdAt: -1 });
productSchema.index({ status: 1, moderationStatus: 1, finalPrice: 1 });
productSchema.index({ status: 1, moderationStatus: 1, soldCount: -1 });
productSchema.index({ status: 1, moderationStatus: 1, averageRating: -1 });
productSchema.index({ status: 1, moderationStatus: 1, searchName: 1 }); // prefix suggestions
// "My products" for a seller.
productSchema.index({ seller: 1, status: 1, createdAt: -1 });

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
