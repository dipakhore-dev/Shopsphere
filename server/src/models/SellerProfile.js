import mongoose from 'mongoose';
import { SELLER_STATUS, SELLER_STATUS_VALUES } from '../utils/constants.js';
import { slugify } from '../utils/slug.js';

/**
 * A seller's public store. Phase 3 only needs the identity fields;
 * Phase 5 adds the application flow, address, payout details, etc.
 */
const sellerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    storeName: { type: String, required: true, trim: true, minlength: 3, maxlength: 60 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: SELLER_STATUS_VALUES, default: SELLER_STATUS.PENDING, index: true },
  },
  { timestamps: true },
);

sellerProfileSchema.pre('validate', function makeSlug() {
  if (!this.slug && this.storeName) this.slug = slugify(this.storeName);
});

export const SellerProfile =
  mongoose.models.SellerProfile || mongoose.model('SellerProfile', sellerProfileSchema);
