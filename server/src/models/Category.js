import mongoose from 'mongoose';
import { slugify } from '../utils/slug.js';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 60 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 300 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

categorySchema.pre('validate', function makeSlug() {
  if (!this.slug && this.name) this.slug = slugify(this.name);
});

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
