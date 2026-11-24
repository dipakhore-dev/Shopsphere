import mongoose from 'mongoose';
import { INDIAN_STATES } from '../utils/constants.js';

const addressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    phone: { type: String, required: true, match: /^[6-9]\d{9}$/ },
    line1: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    line2: { type: String, trim: true, maxlength: 120 },
    landmark: { type: String, trim: true, maxlength: 80 },
    city: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    state: { type: String, required: true, enum: INDIAN_STATES },
    pincode: { type: String, required: true, match: /^[1-9]\d{5}$/ },
    country: { type: String, default: 'India', enum: ['India'] },
    type: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// The DATABASE guarantees at most one default address per user (even under concurrent requests).
addressSchema.index({ user: 1 }, { unique: true, partialFilterExpression: { isDefault: true }, name: 'one_default_per_user' });

export const Address = mongoose.models.Address || mongoose.model('Address', addressSchema);
