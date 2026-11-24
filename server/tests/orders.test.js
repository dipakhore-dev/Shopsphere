import './helpers/env.js';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startTestDb, stopTestDb, clearDb } from './helpers/db.js';
import { createSellerClient } from './helpers/seller.js';
import { addToCart, createShopper, newKey, placeOrder } from './helpers/shopper.js';

const { default: app } = await import('../src/app.js');
const { Category } = await import('../src/models/Category.js');
const { Product } = await import('../src/models/Product.js');
const { Cart } = await import('../src/models/Cart.js');
const { Order } = await import('../src/models/Order.js');
const { SellerOrder } = await import('../src/models/SellerOrder.js');
const { Address } = await import('../src/models/Address.js');
const { User } = await import('../src/models/User.js');
const { outbox } = await import('../src/services/email.service.js');

let category;
let sellerA;
let sellerB;
let shopper;

before(startTestDb);
after(stopTestDb);

beforeEach(async () => {
  await clearDb();
  outbox.length = 0;
  category = await Category.create({ name: 'Electronics' });
  sellerA = await createSellerClient(app, { email: 'a@example.com', storeName: 'Store A' });
  sellerB = await createSellerClient(app, { email: 'b@example.com', storeName: 'Store B' });
  shopper = await createShopper(app);
});

const insert = (seller, overrides = {}) =>
  Product.create({
    seller: seller.user._id,
    store: seller.store._id,
    name: 'Sample Product',
    description: 'A perfectly fine sample product for tests.',
    category: category._id,
    brand: 'Acme',
    price: 100000,
    stock: 10,
    images: [{ url: 'https://example.com/x.png' }],
    ...overrides,
  });

const stockOf = async (p) => (await Product.findById(p._id)).stock;
const cod = (client) => ({ addressId: client.address.id, paymentMethod: 'cod' });

describe('placing an order (cart checkout)', () => {
  let p1;
  let p2;
  beforeEach(async () => {
    p1 = await insert(sellerA, { name: 'Earbuds', price: 100000, discountPrice: 80000, stock: 10 });
    p2 = await insert(sellerB, { name: 'Cable', price: 20000, stock: 5 });
    await addToCart(shopper, p1, 2);
    await addToCart(shopper, p2, 1);
  });

  it('creates one order with one shipment per seller, correct totals and snapshots', async () => {
    const res = await placeOrder(shopper, cod(shopper));
    assert.equal(res.status, 201);

    const order = res.body.data.order;
    assert.match(order.orderNumber, /^SS-\d{6}-[A-Z0-9]{6}$/);
    assert.equal(order.status, 'confirmed'); // cash on delivery is confirmed immediately
    assert.equal(order.paymentMethod, 'cod');
    assert.equal(order.subtotal, 180000);
    assert.equal(order.discountTotal, 40000);
    assert.equal(order.shippingTotal, 4000);
    assert.equal(order.total, 184000);
    assert.equal(order.shipments.length, 2);
    assert.equal(order.shipments.find((s) => s.store.storeName === 'Store A').shippingFee, 0);
    assert.equal(order.shipments.find((s) => s.store.storeName === 'Store B').shippingFee, 4000);
    assert.equal(order.shipments[0].statusHistory[0].status, 'confirmed');
    assert.equal(order.canCancel, true);

    // stock reserved + sold counters updated
    assert.equal(await stockOf(p1), 8);
    assert.equal(await stockOf(p2), 4);
    assert.equal((await Product.findById(p1._id)).soldCount, 2);

    // cart emptied, confirmation email queued
    assert.equal((await shopper.get('/api/cart')).body.data.cart.items.length, 0);
    assert.ok(outbox.some((m) => m.subject.includes(order.orderNumber)));
  });

  it('ignores any price, total or discount sent by the browser', async () => {
    const res = await placeOrder(shopper, { ...cod(shopper), total: 1, subtotal: 1, shippingTotal: 0, price: 1, items: [{ price: 1 }] });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.order.total, 184000);
  });

  it('copies the address: editing or deleting it later does not change the order', async () => {
    const res = await placeOrder(shopper, cod(shopper));
    await shopper.patch(`/api/addresses/${shopper.address.id}`, { city: 'Mumbai', state: 'Maharashtra' });
    await Address.deleteMany({});

    const fetched = await shopper.get(`/api/orders/${res.body.data.order.id}`);
    assert.equal(fetched.body.data.order.shippingAddress.city, 'Kolkata');
  });

  it('keeps product snapshots even if the product is edited afterwards', async () => {
    const res = await placeOrder(shopper, cod(shopper));
    await Product.updateOne({ _id: p1._id }, { name: 'Renamed', price: 999999, finalPrice: 999999 });

    const item = (await shopper.get(`/api/orders/${res.body.data.order.id}`)).body.data.order.shipments
      .flatMap((s) => s.items).find((i) => i.productId === String(p1._id));
    assert.equal(item.name, 'Earbuds');
    assert.equal(item.unitFinalPrice, 80000);
  });

  it('is all-or-nothing: one unavailable line means no order, no stock change, cart kept', async () => {
    await Product.updateOne({ _id: p2._id }, { stock: 0 }); // second line becomes unavailable
    const res = await placeOrder(shopper, cod(shopper));

    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'CHECKOUT_CONFLICT');
    assert.equal(await stockOf(p1), 10, 'stock of the healthy line must be untouched');
    assert.equal(await Order.countDocuments(), 0);
    assert.equal(await SellerOrder.countDocuments(), 0);
    assert.equal((await Cart.findOne({ user: shopper.user._id })).items.length, 2, 'cart must be kept');
  });
});

describe('transaction rollback', () => {
  it('undoes stock reservations if anything fails AFTER stock was reserved', async () => {
    const { SellerProfile } = await import('../src/models/SellerProfile.js');
    const p1 = await insert(sellerA, { name: 'Earbuds', stock: 10 });
    const p2 = await insert(sellerB, { name: 'Cable', stock: 5 });
    await addToCart(shopper, p1, 2);
    await addToCart(shopper, p2, 1);

    // Break the data on purpose: seller B's store vanishes, so building the shipment fails
    // AFTER both products had their stock decremented inside the transaction.
    await SellerProfile.deleteOne({ _id: sellerB.store._id });

    const res = await placeOrder(shopper, cod(shopper));
    assert.equal(res.status, 500);

    assert.equal(await stockOf(p1), 10, 'reserved stock must be rolled back');
    assert.equal(await stockOf(p2), 5, 'reserved stock must be rolled back');
    assert.equal((await Product.findById(p1._id)).soldCount, 0);
    assert.equal(await Order.countDocuments(), 0);
    assert.equal((await Cart.findOne({ user: shopper.user._id })).items.length, 2);
  });
});

describe('Buy Now', () => {
  it('buys one product without touching the cart', async () => {
    const p1 = await insert(sellerA, { name: 'In cart' });
    const p2 = await insert(sellerB, { name: 'Buy now item', price: 70000, stock: 4 });
    await addToCart(shopper, p1, 1);

    const res = await placeOrder(shopper, { ...cod(shopper), buyNow: { productId: String(p2._id), quantity: 2 } });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.order.shipments.length, 1);
    assert.equal(res.body.data.order.subtotal, 140000);
    assert.equal(await stockOf(p2), 2);
    assert.equal((await shopper.get('/api/cart')).body.data.cart.items.length, 1);
  });

  it('refuses buying your own product', async () => {
    const own = await insert(sellerA);
    const seller = { ...sellerA, address: (await sellerA.post('/api/addresses', { fullName: 'Seller A', phone: '9876543210', line1: '1 Main Road', city: 'Pune', state: 'Maharashtra', pincode: '411001' })).body.data.address };
    await User.updateOne({ _id: sellerA.user._id }, { isEmailVerified: true });
    const res = await placeOrder(seller, { ...cod(seller), buyNow: { productId: String(own._id), quantity: 1 } });
    assert.equal(res.status, 409);
    assert.equal(await stockOf(own), 10);
  });
});

describe('checkout validation', () => {
  beforeEach(async () => {
    await addToCart(shopper, await insert(sellerA), 1);
  });

  it('needs a verified email', async () => {
    const unverified = await createShopper(app, { email: 'new@example.com', verified: false });
    const res = await placeOrder(unverified, cod(unverified));
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'EMAIL_NOT_VERIFIED');
  });

  it('needs an Idempotency-Key header', async () => {
    const res = await shopper.agent.post('/api/orders').set('X-CSRF-Token', shopper.csrf).send(cod(shopper));
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'IDEMPOTENCY_KEY_REQUIRED');
  });

  it('rejects an empty cart, a foreign address and unsupported payment methods', async () => {
    const empty = await createShopper(app, { email: 'empty@example.com' });
    assert.equal((await placeOrder(empty, cod(empty))).body.code, 'CART_EMPTY');

    const stranger = await createShopper(app, { email: 'stranger@example.com' });
    const foreign = await placeOrder(shopper, { addressId: stranger.address.id, paymentMethod: 'cod' });
    assert.equal(foreign.status, 400);
    assert.equal(foreign.body.code, 'INVALID_ADDRESS');

    assert.equal((await placeOrder(shopper, { addressId: shopper.address.id, paymentMethod: 'razorpay' })).status, 400);
  });

  it('is closed to anonymous users', async () => {
    const res = await request(app).get('/api/orders/my');
    assert.equal(res.status, 401);
  });
});

describe('idempotency and concurrency', () => {
  it('the same key twice returns the same order and deducts stock once', async () => {
    const p = await insert(sellerA, { stock: 10 });
    await addToCart(shopper, p, 2);
    const key = newKey();

    const first = await placeOrder(shopper, cod(shopper), key);
    const second = await placeOrder(shopper, cod(shopper), key);

    assert.equal(first.status, 201);
    assert.equal(second.status, 200);
    assert.equal(second.body.data.idempotentReplay, true);
    assert.equal(second.body.data.order.id, first.body.data.order.id);
    assert.equal(await Order.countDocuments(), 1);
    assert.equal(await stockOf(p), 8);
  });

  it('two simultaneous requests with the same key create ONE order', async () => {
    const p = await insert(sellerA, { stock: 10 });
    await addToCart(shopper, p, 2);
    const key = newKey();

    const [a, b] = await Promise.all([placeOrder(shopper, cod(shopper), key), placeOrder(shopper, cod(shopper), key)]);

    assert.ok([a.status, b.status].every((s) => s === 200 || s === 201), `got ${a.status} and ${b.status}`);
    assert.equal(a.body.data.order.id, b.body.data.order.id);
    assert.equal(await Order.countDocuments(), 1);
    assert.equal(await stockOf(p), 8, 'stock must be deducted exactly once');
  });

  it('never oversells: with 1 item left and 2 buyers, exactly one wins', async () => {
    const p = await insert(sellerA, { stock: 1 });
    const buyer2 = await createShopper(app, { email: 'buyer2@example.com' });
    await addToCart(shopper, p, 1);
    await addToCart(buyer2, p, 1);

    const results = await Promise.all([placeOrder(shopper, cod(shopper)), placeOrder(buyer2, cod(buyer2))]);
    const statuses = results.map((r) => r.status).sort();

    assert.deepEqual(statuses, [201, 409]);
    assert.equal(await stockOf(p), 0);
    assert.equal(await Order.countDocuments(), 1);
  });
});

describe('viewing orders', () => {
  let order;
  beforeEach(async () => {
    await addToCart(shopper, await insert(sellerA), 1);
    order = (await placeOrder(shopper, cod(shopper))).body.data.order;
  });

  it('lists my orders with pagination and a status filter', async () => {
    const list = await shopper.get('/api/orders/my');
    assert.equal(list.body.data.orders.length, 1);
    assert.equal(list.body.meta.total, 1);

    assert.equal((await shopper.get('/api/orders/my?status=cancelled')).body.data.orders.length, 0);
    assert.equal((await shopper.get('/api/orders/my?status=bogus')).status, 400);
  });

  it("another customer cannot see, list or cancel my order", async () => {
    const intruder = await createShopper(app, { email: 'intruder@example.com' });
    assert.equal((await intruder.get(`/api/orders/${order.id}`)).status, 404);
    assert.equal((await intruder.get('/api/orders/my')).body.data.orders.length, 0);
    assert.equal((await intruder.patch(`/api/orders/${order.id}/cancel`, {})).status, 404);
    assert.equal((await Order.findById(order.id)).status, 'confirmed');
  });

  it('previews checkout totals with the same maths as order creation', async () => {
    const p = await insert(sellerB, { name: 'Preview item', price: 30000, stock: 5 });
    const res = await shopper.post('/api/orders/preview', { buyNow: { productId: String(p._id), quantity: 2 } });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.checkout.summary.subtotal, 60000);
    assert.equal(res.body.data.checkout.summary.shippingTotal, 0);
    assert.equal(res.body.data.checkout.canCheckout, true);
  });
});

describe('cancelling an order', () => {
  it('restores stock and marks every shipment cancelled', async () => {
    const p1 = await insert(sellerA, { stock: 10 });
    const p2 = await insert(sellerB, { name: 'Other', stock: 5 });
    await addToCart(shopper, p1, 3);
    await addToCart(shopper, p2, 2);
    const order = (await placeOrder(shopper, cod(shopper))).body.data.order;
    assert.equal(await stockOf(p1), 7);

    const res = await shopper.patch(`/api/orders/${order.id}/cancel`, { reason: 'Changed my mind' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.order.status, 'cancelled');
    assert.equal(res.body.data.order.cancellationReason, 'Changed my mind');
    assert.ok(res.body.data.order.shipments.every((s) => s.status === 'cancelled'));
    assert.equal(res.body.data.order.canCancel, false);

    assert.equal(await stockOf(p1), 10);
    assert.equal(await stockOf(p2), 5);
    assert.equal((await Product.findById(p1._id)).soldCount, 0);
  });

  it('cannot be cancelled twice', async () => {
    await addToCart(shopper, await insert(sellerA), 1);
    const order = (await placeOrder(shopper, cod(shopper))).body.data.order;
    await shopper.patch(`/api/orders/${order.id}/cancel`, {});
    const again = await shopper.patch(`/api/orders/${order.id}/cancel`, {});
    assert.equal(again.status, 409);
    assert.equal(again.body.code, 'ORDER_ALREADY_CANCELLED');
  });

  it('is refused once any shipment has shipped, and stock stays deducted', async () => {
    const p1 = await insert(sellerA, { stock: 10 });
    const p2 = await insert(sellerB, { name: 'Other', stock: 5 });
    await addToCart(shopper, p1, 1);
    await addToCart(shopper, p2, 1);
    const order = (await placeOrder(shopper, cod(shopper))).body.data.order;

    await SellerOrder.updateOne({ order: order.id, storeName: 'Store A' }, { status: 'shipped' });

    const res = await shopper.patch(`/api/orders/${order.id}/cancel`, {});
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'ORDER_NOT_CANCELLABLE');
    assert.equal(await stockOf(p1), 9);
    assert.equal((await Order.findById(order.id)).status, 'confirmed');
  });
});

describe('order status helper', () => {
  it('derives the parent status from shipments', async () => {
    const { deriveOrderStatus } = await import('../src/utils/orderStatus.js');
    assert.equal(deriveOrderStatus(['cancelled', 'cancelled']), 'cancelled');
    assert.equal(deriveOrderStatus(['shipped', 'confirmed']), 'confirmed');
    assert.equal(deriveOrderStatus(['delivered', 'delivered']), 'delivered');
    assert.equal(deriveOrderStatus(['delivered', 'cancelled']), 'delivered');
    assert.equal(deriveOrderStatus(['shipped', 'out_for_delivery']), 'shipped');
  });
});
