import './helpers/env.js';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startTestDb, stopTestDb, clearDb } from './helpers/db.js';
import { createSellerClient } from './helpers/seller.js';
import { addressPayload, createShopper } from './helpers/shopper.js';

const { default: app } = await import('../src/app.js');
const { Category } = await import('../src/models/Category.js');
const { Product } = await import('../src/models/Product.js');
const { Address } = await import('../src/models/Address.js');

let shopper;
let other;

before(startTestDb);
after(stopTestDb);
beforeEach(async () => {
  await clearDb();
  shopper = await createShopper(app, { withAddress: false });
  other = await createShopper(app, { email: 'other@example.com', withAddress: false });
});

describe('addresses', () => {
  it('requires login', async () => {
    assert.equal((await request(app).get('/api/addresses')).status, 401);
  });

  it('the first address becomes the default; a later default replaces it', async () => {
    const first = await shopper.post('/api/addresses', addressPayload());
    assert.equal(first.status, 201);
    assert.equal(first.body.data.address.isDefault, true);
    assert.equal(first.body.data.address.phone, '9876543210'); // normalised

    const second = await shopper.post('/api/addresses', addressPayload({ line1: '9 Lake Road', isDefault: true }));
    assert.equal(second.body.data.address.isDefault, true);

    const list = (await shopper.get('/api/addresses')).body.data.addresses;
    assert.equal(list.filter((a) => a.isDefault).length, 1);
    assert.equal(list[0].line1, '9 Lake Road'); // default listed first
  });

  it('the database itself refuses two default addresses for one user', async () => {
    const a = await shopper.post('/api/addresses', addressPayload());
    await assert.rejects(
      Address.create({ ...addressPayload({ phone: '9876543210' }), user: shopper.user._id, isDefault: true }),
      (err) => err.code === 11000,
    );
    assert.ok(a.body.data.address.id);
  });

  it('validates input', async () => {
    for (const bad of [{ pincode: '12345' }, { pincode: '012345' }, { phone: '12345' }, { state: 'Atlantis' }, { fullName: '<b>x</b>' }, { line1: '' }]) {
      const res = await shopper.post('/api/addresses', addressPayload(bad));
      assert.equal(res.status, 400, JSON.stringify(bad));
    }
  });

  it('accepts common phone formats', async () => {
    const res = await shopper.post('/api/addresses', addressPayload({ phone: '+91-98765 43210' }));
    assert.equal(res.body.data.address.phone, '9876543210');
  });

  it("one customer cannot read, edit or delete another's address (404)", async () => {
    const mine = (await shopper.post('/api/addresses', addressPayload())).body.data.address;

    assert.equal((await other.patch(`/api/addresses/${mine.id}`, { city: 'Hacked' })).status, 404);
    assert.equal((await other.delete(`/api/addresses/${mine.id}`)).status, 404);
    assert.equal((await other.get('/api/addresses')).body.data.addresses.length, 0);
    assert.equal((await Address.findById(mine.id)).city, 'Kolkata');
  });

  it('deleting the default promotes another address', async () => {
    const a = (await shopper.post('/api/addresses', addressPayload())).body.data.address;
    const b = (await shopper.post('/api/addresses', addressPayload({ line1: '9 Lake Road' }))).body.data.address;
    assert.equal(b.isDefault, false);

    await shopper.delete(`/api/addresses/${a.id}`);
    const list = (await shopper.get('/api/addresses')).body.data.addresses;
    assert.equal(list.length, 1);
    assert.equal(list[0].isDefault, true);
  });

  it('allows at most 10 addresses', async () => {
    for (let i = 0; i < 10; i += 1) {
      assert.equal((await shopper.post('/api/addresses', addressPayload({ line1: `${i + 1} Some Street` }))).status, 201);
    }
    assert.equal((await shopper.post('/api/addresses', addressPayload({ line1: '11 Some Street' }))).status, 409);
  });
});

describe('wishlist', () => {
  let seller;
  let product;
  beforeEach(async () => {
    const category = await Category.create({ name: 'Books' });
    seller = await createSellerClient(app, { email: 's@example.com', storeName: 'Shop S' });
    product = await Product.create({
      seller: seller.user._id, store: seller.store._id, name: 'A Good Book', description: 'A really good book to read.',
      category: category._id, brand: 'Press', price: 50000, stock: 3, images: [{ url: 'https://example.com/b.png' }],
    });
  });

  it('adding is idempotent and is private to the user', async () => {
    const first = await shopper.post(`/api/wishlist/${product._id}`);
    const again = await shopper.post(`/api/wishlist/${product._id}`);
    assert.equal(first.status, 201);
    assert.deepEqual(again.body.data.ids, [String(product._id)]); // still one entry

    assert.deepEqual((await other.get('/api/wishlist/ids')).body.data.ids, []);
  });

  it('lists products newest first and hides ones that are no longer for sale', async () => {
    await shopper.post(`/api/wishlist/${product._id}`);
    assert.equal((await shopper.get('/api/wishlist')).body.data.products.length, 1);

    await Product.updateOne({ _id: product._id }, { status: 'inactive' });
    assert.equal((await shopper.get('/api/wishlist')).body.data.products.length, 0);
  });

  it('removes items and rejects unknown or hidden products', async () => {
    await shopper.post(`/api/wishlist/${product._id}`);
    const removed = await shopper.delete(`/api/wishlist/${product._id}`);
    assert.deepEqual(removed.body.data.ids, []);

    assert.equal((await shopper.post('/api/wishlist/64b7f0f0f0f0f0f0f0f0f0f0')).status, 404);
    assert.equal((await shopper.post('/api/wishlist/not-an-id')).status, 400);
  });
});
