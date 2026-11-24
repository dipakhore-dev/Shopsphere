import mongoose from 'mongoose';
import { CART_LIMITS } from '../utils/constants.js';

/**
 * The cart stores ONLY product ids and quantities. Prices are never saved here:
 * they are read from the product at the moment the cart is viewed or checked out,
 * so a stale price can never be charged.
 */
const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, max: CART_LIMITS.MAX_QTY_PER_ITEM, validate: Number.isInteger },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: {
      type: [cartItemSchema],
      validate: [(arr) => arr.length <= CART_LIMITS.MAX_DISTINCT_ITEMS, `A cart can hold at most ${CART_LIMITS.MAX_DISTINCT_ITEMS} different products`],
    },
  },
  { timestamps: true },
);

export const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);
