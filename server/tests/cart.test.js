import './helpers/env.js';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startTestDb, stopTestDb, clearDb } from './helpers/db.js';
import { createSellerClient } from './helpers/seller.js';
import { addToCart, createShopper } from './helpers/shopper.js';

const { default: app } = await import('../src/app.js');
const { Category } = await import('../src/models/Category.js');
const { Product } = await import('../src/models/Product.js');
const { Cart } = await import('../src/models/Cart.js');
const { User } = await import('../src/models/User.js');

let category;
let sellerA;
let sellerB;
let shopper;

before(startTestDb);
after(stopTestDb);

beforeEach(async () => {
  await clearDb();
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

describe('access control', () => {
  it('requires login and is closed to admins', async () => {
    assert.equal((await request(app).get('/api/cart')).status, 401);

    const admin = await createShopper(app, { email: 'admin@example.com', withAddress: false });
    await User.updateOne({ _id: admin.user._id }, { role: 'admin' });
    assert.equal((await admin.get('/api/cart')).status, 403);
  });

  it('every customer has a private cart', async () => {
    const p = await insert(sellerA);
    await addToCart(shopper, p, 2);

    const other = await createShopper(app, { email: 'other@example.com', withAddress: false });
    const view = await other.get('/api/cart');
    assert.equal(view.body.data.cart.items.length, 0);
  });
});

describe('adding and changing items', () => {
  it('adds a product and returns live prices and server-calculated totals', async () => {
    const p = await insert(sellerA, { price: 100000, discountPrice: 80000 });
    const res = await addToCart(shopper, p, 2);

    assert.equal(res.status, 201);
    const cart = res.body.data.cart;
    assert.equal(cart.items[0].quantity, 2);
    assert.equal(cart.items[0].lineTotal, 160000);
    assert.equal(cart.summary.subtotal, 160000);
    assert.equal(cart.summary.discountTotal, 40000);
    assert.equal(cart.summary.shippingTotal, 0); // 1600 >= free-shipping threshold of 500
    assert.equal(cart.summary.total, 160000);
    assert.equal(cart.canCheckout, true);
  });

  it('never stores a price in the cart document', async () => {
    const p = await insert(sellerA);
    await addToCart(shopper, p, 1);
    const stored = await Cart.findOne({ user: shopper.user._id }).lean();
    assert.deepEqual(Object.keys(stored.items[0]).sort(), ['addedAt', 'product', 'quantity']);
  });

  it('adding the same product again increases the quantity', async () => {
    const p = await insert(sellerA);
    await addToCart(shopper, p, 2);
    const res = await addToCart(shopper, p, 3);
    assert.equal(res.body.data.cart.items.length, 1);
    assert.equal(res.body.data.cart.items[0].quantity, 5);
  });

  it('five simultaneous adds result in exactly five (atomic updates)', async () => {
    const p = await insert(sellerA, { stock: 50 });
    await Promise.all(Array.from({ length: 5 }, () => addToCart(shopper, p, 1)));
    const cart = (await shopper.get('/api/cart')).body.data.cart;
    assert.equal(cart.items.length, 1);
    assert.equal(cart.items[0].quantity, 5);
  });

  it('refuses more than the stock or more than 10 of one product', async () => {
    const scarce = await insert(sellerA, { stock: 3 });
    const over = await addToCart(shopper, scarce, 4);
    assert.equal(over.status, 409);
    assert.equal(over.body.code, 'INSUFFICIENT_STOCK');

    const plenty = await insert(sellerA, { name: 'Plenty', stock: 100 });
    await addToCart(shopper, plenty, 10);
    const tooMany = await addToCart(shopper, plenty, 1);
    assert.equal(tooMany.status, 409);
    assert.equal(tooMany.body.code, 'MAX_QUANTITY');
  });

  it('validates quantities', async () => {
    const p = await insert(sellerA);
    for (const quantity of [0, -1, 11, 1.5, '2']) {
      const res = await shopper.post('/api/cart/items', { productId: String(p._id), quantity });
      assert.equal(res.status, 400, String(quantity));
    }
  });

  it('cannot add hidden products or your own products', async () => {
    const inactive = await insert(sellerA, { status: 'inactive' });
    const removed = await insert(sellerA, { moderationStatus: 'removed' });
    assert.equal((await addToCart(shopper, inactive)).status, 404);
    assert.equal((await addToCart(shopper, removed)).status, 404);

    const own = await insert(sellerA);
    const res = await addToCart(sellerA, own);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'OWN_PRODUCT');
  });

  it('PATCH sets an exact quantity, DELETE removes a line', async () => {
    const p = await insert(sellerA);
    await addToCart(shopper, p, 4);

    const patched = await shopper.patch(`/api/cart/items/${p._id}`, { quantity: 2 });
    assert.equal(patched.body.data.cart.items[0].quantity, 2);

    const missing = await shopper.patch(`/api/cart/items/${(await insert(sellerA, { name: 'Other' }))._id}`, { quantity: 1 });
    assert.equal(missing.status, 404);

    const removed = await shopper.delete(`/api/cart/items/${p._id}`);
    assert.equal(removed.body.data.cart.items.length, 0);
  });
});

describe('totals across sellers', () => {
  it('charges shipping per seller shipment and groups them', async () => {
    const a = await insert(sellerA, { price: 100000, discountPrice: 80000 }); // 2 x 800 = 1600 -> free shipping
    const b = await insert(sellerB, { name: 'Cheap', price: 20000 }); // 1 x 200 -> Rs 40 shipping
    await addToCart(shopper, a, 2);
    const res = await addToCart(shopper, b, 1);

    const { summary, shipments } = res.body.data.cart;
    assert.equal(summary.subtotal, 180000);
    assert.equal(summary.discountTotal, 40000);
    assert.equal(summary.shippingTotal, 4000);
    assert.equal(summary.total, 184000);
    assert.equal(summary.itemCount, 3);
    assert.equal(shipments.length, 2);
    assert.deepEqual(shipments.map((s) => s.shippingFee).sort((x, y) => x - y), [0, 4000]);
  });

  it('uses the CURRENT price every time (a seller edit is reflected immediately)', async () => {
    const p = await insert(sellerA, { price: 100000 });
    await addToCart(shopper, p, 1);
    await Product.findById(p._id).then((doc) => {
      doc.price = 150000;
      return doc.save();
    });
    const cart = (await shopper.get('/api/cart')).body.data.cart;
    assert.equal(cart.summary.subtotal, 150000);
  });

  it('flags lines that became unbuyable, excludes them from totals and blocks checkout', async () => {
    const p = await insert(sellerA, { stock: 5 });
    const q = await insert(sellerB, { name: 'Fine', price: 60000 });
    await addToCart(shopper, p, 2);
    await addToCart(shopper, q, 1);

    await Product.updateOne({ _id: p._id }, { stock: 1 }); // now only 1 left, cart wants 2
    let cart = (await shopper.get('/api/cart')).body.data.cart;
    const line = cart.items.find((i) => i.productId === String(p._id));
    assert.equal(line.issue, 'INSUFFICIENT_STOCK');
    assert.equal(cart.canCheckout, false);
    assert.equal(cart.summary.subtotal, 60000); // only the healthy line is counted

    await Product.updateOne({ _id: p._id }, { status: 'inactive' });
    cart = (await shopper.get('/api/cart')).body.data.cart;
    assert.equal(cart.items.find((i) => i.productId === String(p._id)).issue, 'UNAVAILABLE');
  });
});
