import mongoose from 'mongoose';
import { ORDER_STATUS, ORDER_STATUS_VALUES } from '../utils/constants.js';

const int = { type: Number, required: true, min: 0, validate: Number.isInteger }; // paise

/** Snapshot of a product at purchase time. Later price/name/image edits never change an old order. */
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    brand: String,
    image: String,
    quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
    unitPrice: int, // listed price
    unitFinalPrice: int, // price actually charged per unit
    lineTotal: int, // unitFinalPrice * quantity
  },
  { _id: false },
);

const historySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUS_VALUES, required: true },
    at: { type: Date, default: Date.now },
    note: { type: String, maxlength: 300 },
  },
  { _id: false },
);

/**
 * The part of an order that ONE seller fulfils. A seller only ever sees and updates
 * their own SellerOrders, which is how "sellers cannot touch other sellers' orders" is enforced.
 */
const sellerOrderSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderNumber: { type: String, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'SellerProfile', required: true },
    storeName: { type: String, required: true },

    items: { type: [orderItemSchema], validate: [(a) => a.length > 0, 'A shipment needs at least one item'] },
    subtotal: int,
    shippingFee: int,
    total: int,

    status: { type: String, enum: ORDER_STATUS_VALUES, default: ORDER_STATUS.PENDING },
    statusHistory: [historySchema],
  },
  { timestamps: true },
);

sellerOrderSchema.index({ seller: 1, status: 1, createdAt: -1 }); // seller order list (Phase 5)
sellerOrderSchema.index({ customer: 1 });

export const SellerOrder = mongoose.models.SellerOrder || mongoose.model('SellerOrder', sellerOrderSchema);
