import mongoose from 'mongoose';
import {
  INDIAN_STATES,
  ORDER_STATUS,
  ORDER_STATUS_VALUES,
  PAYMENT_METHOD_VALUES,
  PAYMENT_STATUS,
  PAYMENT_STATUS_VALUES,
} from '../utils/constants.js';

const int = { type: Number, required: true, min: 0, validate: Number.isInteger }; // paise

/** A COPY of the address at purchase time: editing or deleting the saved address never alters past orders. */
const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: String,
    phone: String,
    line1: String,
    line2: String,
    landmark: String,
    city: String,
    state: { type: String, enum: INDIAN_STATES },
    pincode: String,
    country: String,
  },
  { _id: false },
);

/**
 * The customer's order. It owns the money and the delivery address.
 * What each seller must ship lives in SellerOrder (one per seller).
 */
const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Client-generated key that makes "place order" safe to retry (see order.service.js).
    idempotencyKey: { type: String, required: true },

    shippingAddress: { type: shippingAddressSchema, required: true },

    paymentMethod: { type: String, enum: PAYMENT_METHOD_VALUES, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUS_VALUES, default: PAYMENT_STATUS.PENDING },

    // All amounts are integer paise, calculated by the server.
    subtotal: int, // what the items cost after seller discounts
    discountTotal: int, // how much the customer saved versus the listed prices
    shippingTotal: int,
    total: int, // subtotal + shippingTotal  <- the amount to collect

    status: { type: String, enum: ORDER_STATUS_VALUES, default: ORDER_STATUS.PENDING },
    placedAt: { type: Date, default: Date.now },
    cancelledAt: Date,
    cancellationReason: { type: String, maxlength: 300 },
  },
  { timestamps: true },
);

// A retried request with the same key can never create a second order.
orderSchema.index({ customer: 1, idempotencyKey: 1 }, { unique: true, name: 'one_order_per_idempotency_key' });
orderSchema.index({ customer: 1, createdAt: -1 });

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
