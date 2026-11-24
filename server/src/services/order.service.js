import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Address } from '../models/Address.js';
import { Cart } from '../models/Cart.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { SellerOrder } from '../models/SellerOrder.js';
import { ApiError } from '../utils/ApiError.js';
import {
  CUSTOMER_CANCELLABLE,
  MODERATION_STATUS,
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PRODUCT_STATUS,
} from '../utils/constants.js';
import { buildPageMeta } from '../utils/pagination.js';
import { logger } from '../utils/logger.js';
import { ISSUE_MESSAGES, lineIssue, priceLines } from './pricing.service.js';
import { buildCheckoutView } from './cart.service.js';
import { sendOrderConfirmationEmail } from './email.service.js';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L: easy to read out over the phone

function generateOrderNumber() {
  const d = new Date();
  const date = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  const random = Array.from({ length: 6 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');
  return `SS-${date}-${random}`;
}

const checkoutConflict = (productId, issue, name, stock) =>
  new ApiError(409, ISSUE_MESSAGES[issue](name, stock), [{ productId: String(productId), issue }], 'CHECKOUT_CONFLICT');

// ---------------------------------------------------------------- preview

/** What checkout will charge, using the same pricing code as order creation. */
export async function previewCheckout(user, buyNow) {
  if (buyNow) return buildCheckoutView(user._id, [{ product: buyNow.productId, quantity: buyNow.quantity }]);
  const cart = await Cart.findOne({ user: user._id }).lean();
  return buildCheckoutView(user._id, cart?.items ?? []);
}

// ---------------------------------------------------------------- create

async function loadLines(user, buyNow, session) {
  let raw;
  if (buyNow) {
    raw = [{ product: buyNow.productId, quantity: buyNow.quantity }];
  } else {
    const cart = await Cart.findOne({ user: user._id }).session(session).lean();
    raw = cart?.items ?? [];
    if (raw.length === 0) throw ApiError.badRequest('Your cart is empty', 'CART_EMPTY');
  }

  const products = await Product.find({ _id: { $in: raw.map((r) => r.product) } })
    .select('name brand images price finalPrice stock seller store status moderationStatus')
    .populate({ path: 'store', select: 'storeName' })
    .session(session)
    .lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  return raw.map((r) => {
    const product = byId.get(String(r.product));
    const issue = lineIssue(product, r.quantity, user._id);
    if (issue) throw checkoutConflict(r.product, issue, product?.name ?? 'This product', product?.stock ?? 0);
    return { product, quantity: r.quantity };
  });
}

async function placeOrderTransaction(user, address, { buyNow, paymentMethod }, idempotencyKey) {
  return mongoose.connection.transaction(
    async (session) => {
      // 1. Re-read EVERYTHING inside the transaction and price it on the server.
      const lines = await loadLines(user, buyNow, session);
      const { shipments, summary } = priceLines(lines);

      // 2. Reserve stock. Each update is atomic and only succeeds if enough stock is still
      //    there AND the price is still the one we just calculated with. If any line fails,
      //    the whole transaction (including the lines that succeeded) is rolled back.
      for (const { product, quantity } of lines) {
        const result = await Product.updateOne(
          {
            _id: product._id,
            status: PRODUCT_STATUS.ACTIVE,
            moderationStatus: MODERATION_STATUS.APPROVED,
            stock: { $gte: quantity },
            finalPrice: product.finalPrice,
          },
          { $inc: { stock: -quantity, soldCount: quantity } },
          { session },
        );
        if (result.modifiedCount !== 1) throw checkoutConflict(product._id, 'INSUFFICIENT_STOCK', product.name, 0);
      }

      // 3. Create the order and one shipment per seller. Cash on delivery needs no payment step,
      //    so it is confirmed immediately (online payments will start as "pending", Phase 7).
      const status = paymentMethod === PAYMENT_METHOD.COD ? ORDER_STATUS.CONFIRMED : ORDER_STATUS.PENDING;
      const orderNumber = generateOrderNumber();
      const now = new Date();

      const [order] = await Order.create(
        [
          {
            orderNumber,
            customer: user._id,
            idempotencyKey,
            shippingAddress: {
              fullName: address.fullName,
              phone: address.phone,
              line1: address.line1,
              line2: address.line2,
              landmark: address.landmark,
              city: address.city,
              state: address.state,
              pincode: address.pincode,
              country: address.country,
            },
            paymentMethod,
            paymentStatus: PAYMENT_STATUS.PENDING,
            subtotal: summary.subtotal,
            discountTotal: summary.discountTotal,
            shippingTotal: summary.shippingTotal,
            total: summary.total,
            status,
            placedAt: now,
          },
        ],
        { session },
      );

      const sellerOrders = await SellerOrder.create(
        shipments.map((s) => ({
          order: order._id,
          orderNumber,
          customer: user._id,
          seller: s.seller,
          store: s.store._id,
          storeName: s.store.storeName,
          items: s.items.map((i) => ({
            product: i.product._id,
            name: i.product.name,
            brand: i.product.brand,
            image: i.product.images?.[0]?.url,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            unitFinalPrice: i.unitFinalPrice,
            lineTotal: i.lineTotal,
          })),
          subtotal: s.subtotal,
          shippingFee: s.shippingFee,
          total: s.total,
          status,
          statusHistory: [{ status, at: now, note: paymentMethod === PAYMENT_METHOD.COD ? 'Order placed (Cash on Delivery)' : 'Order placed' }],
        })),
        { session },
      );

      // 4. Cart checkout empties the cart; Buy Now leaves it untouched.
      if (!buyNow) await Cart.updateOne({ user: user._id }, { $set: { items: [] } }, { session });

      return { order: order.toObject(), sellerOrders: sellerOrders.map((s) => s.toObject()) };
    },
    { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } },
  );
}

async function findExisting(userId, idempotencyKey) {
  const order = await Order.findOne({ customer: userId, idempotencyKey }).lean();
  if (!order) return null;
  const sellerOrders = await SellerOrder.find({ order: order._id }).lean();
  return { order, sellerOrders, replay: true };
}

/**
 * Places an order. Safe to retry: the same Idempotency-Key always returns the SAME order
 * and never deducts stock twice (the unique index on (customer, idempotencyKey) is the guarantee).
 */
export async function createOrder(user, { addressId, paymentMethod, buyNow }, idempotencyKey) {
  const replay = await findExisting(user._id, idempotencyKey);
  if (replay) return replay;

  const address = await Address.findOne({ _id: addressId, user: user._id }).lean();
  if (!address) throw ApiError.badRequest('Please choose a valid delivery address', 'INVALID_ADDRESS');

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await placeOrderTransaction(user, address, { buyNow, paymentMethod }, idempotencyKey);

      // Email is sent AFTER the commit and can never fail the order.
      sendOrderConfirmationEmail(user, result.order, result.sellerOrders).catch((err) => logger.error('Order email failed:', err.message));
      return { ...result, replay: false };
    } catch (err) {
      // If an order with this key now exists, this request DID succeed (a parallel duplicate won the race,
      // possibly making ours fail with a write conflict or "cart is empty"). Return it instead of an error.
      const duplicate = await findExisting(user._id, idempotencyKey);
      if (duplicate) return duplicate;

      if (err?.code === 11000 && err.keyPattern?.orderNumber) continue; // astronomically rare number collision: retry
      throw err;
    }
  }
  throw new ApiError(500, 'Could not generate a unique order number. Please try again.');
}

// ---------------------------------------------------------------- read

export async function listMyOrders(user, { page, limit, status }) {
  const filter = { customer: user._id };
  if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);

  const shipments = orders.length ? await SellerOrder.find({ order: { $in: orders.map((o) => o._id) } }).lean() : [];
  const byOrder = new Map();
  for (const s of shipments) {
    const key = String(s.order);
    byOrder.set(key, [...(byOrder.get(key) ?? []), s]);
  }

  return {
    orders: orders.map((order) => ({ order, shipments: byOrder.get(String(order._id)) ?? [] })),
    meta: buildPageMeta({ page, limit, total }),
  };
}

/** Ownership is part of the query, so another customer's order answers 404. */
export async function getMyOrder(user, orderId) {
  const order = await Order.findOne({ _id: orderId, customer: user._id }).lean();
  if (!order) throw ApiError.notFound('Order not found');
  const shipments = await SellerOrder.find({ order: order._id }).sort({ createdAt: 1 }).lean();
  return { order, shipments };
}

// ---------------------------------------------------------------- cancel

export async function cancelOrder(user, orderId, reason) {
  await mongoose.connection.transaction(async (session) => {
    const order = await Order.findOne({ _id: orderId, customer: user._id }).session(session);
    if (!order) throw ApiError.notFound('Order not found');
    if (order.status === ORDER_STATUS.CANCELLED) {
      throw new ApiError(409, 'This order is already cancelled', undefined, 'ORDER_ALREADY_CANCELLED');
    }

    const shipments = await SellerOrder.find({ order: order._id }).session(session);
    const active = shipments.filter((s) => s.status !== ORDER_STATUS.CANCELLED);

    if (active.some((s) => !CUSTOMER_CANCELLABLE.includes(s.status))) {
      throw new ApiError(409, 'Some items have already shipped, so this order can no longer be cancelled. You can request a return after delivery.', undefined, 'ORDER_NOT_CANCELLABLE');
    }

    const now = new Date();
    for (const shipment of active) {
      // Atomic claim: if a seller moves this shipment to "shipped" at the same instant, only one of us wins.
      const claimed = await SellerOrder.updateOne(
        { _id: shipment._id, status: { $in: CUSTOMER_CANCELLABLE } },
        { $set: { status: ORDER_STATUS.CANCELLED }, $push: { statusHistory: { status: ORDER_STATUS.CANCELLED, at: now, note: reason || 'Cancelled by customer' } } },
        { session },
      );
      if (claimed.modifiedCount !== 1) {
        throw new ApiError(409, 'This order changed while cancelling. Please refresh and try again.', undefined, 'ORDER_NOT_CANCELLABLE');
      }

      // Put the stock back.
      for (const item of shipment.items) {
        await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity, soldCount: -item.quantity } }, { session });
      }
    }

    order.status = ORDER_STATUS.CANCELLED;
    order.cancelledAt = now;
    order.cancellationReason = reason || undefined;
    // Phase 7: an already PAID online order will also create a Refund record here.
    await order.save({ session });
  });

  return getMyOrder(user, orderId);
}
