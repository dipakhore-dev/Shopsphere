import './helpers/env.js';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startTestDb, stopTestDb, clearDb } from './helpers/db.js';
import { createClient } from './helpers/client.js';
import {
  FAKE_PNG_TEXT,
  PNG_BYTES,
  createCustomerClient,
  createSellerClient,
  productPayload,
  useFakeImageStorage,
} from './helpers/seller.js';

const { default: app } = await import('../src/app.js');
const { Category } = await import('../src/models/Category.js');
const { Product } = await import('../src/models/Product.js');

let electronics;
let books;
let sellerA;
let sellerB;

before(async () => {
  await startTestDb();
  useFakeImageStorage();
});
after(stopTestDb);

beforeEach(async () => {
  await clearDb();
  [electronics, books] = await Category.create([{ name: 'Electronics' }, { name: 'Books' }]);
  sellerA = await createSellerClient(app, { email: 'a@example.com', storeName: 'Store A' });
  sellerB = await createSellerClient(app, { email: 'b@example.com', storeName: 'Store B' });
});

/** Inserts a product directly (bypassing the API) for listing tests. */
const insert = (overrides = {}) =>
  Product.create({
    seller: sellerA.user._id,
    store: sellerA.store._id,
    name: 'Sample Product',
    description: 'A perfectly fine sample product for tests.',
    category: electronics._id,
    brand: 'Acme',
    price: 100000,
    stock: 10,
    images: [{ url: 'https://example.com/x.png' }],
    ...overrides,
  });

describe('POST /api/products (create)', () => {
  it('requires authentication, the seller role and an approved store', async () => {
    const anon = await createClient(app);
    assert.equal((await anon.post('/api/products', {})).status, 401);

    const customer = await createCustomerClient(app);
    const asCustomer = await customer.post('/api/products', {});
    assert.equal(asCustomer.status, 403);
    assert.equal(asCustomer.body.code, 'FORBIDDEN_ROLE');

    const pending = await createSellerClient(app, { email: 'p@example.com', storeName: 'Pending', status: 'pending' });
    const res = await pending.post('/api/products', productPayload(pending.user, electronics._id));
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'SELLER_NOT_APPROVED');
  });

  it('creates a product owned by the logged-in seller and calculates finalPrice', async () => {
    const res = await sellerA.post('/api/products', productPayload(sellerA.user, electronics._id));
    assert.equal(res.status, 201);

    const p = res.body.data.product;
    assert.equal(p.price, 499900);
    assert.equal(p.finalPrice, 399900);
    assert.equal(p.discountPercent, 20);
    assert.equal(p.store.storeName, 'Store A');
    assert.equal(p.category.slug, 'electronics');
    assert.equal(p.status, 'active');

    const stored = await Product.findById(p.id);
    assert.equal(String(stored.seller), String(sellerA.user._id));
  });

  it('ignores fields a seller must not control (mass assignment)', async () => {
    const res = await sellerA.post('/api/products', {
      ...productPayload(sellerA.user, electronics._id),
      seller: String(sellerB.user._id),
      averageRating: 5,
      reviewCount: 9999,
      soldCount: 9999,
      moderationStatus: 'approved',
      finalPrice: 1,
    });
    assert.equal(res.status, 201);
    const stored = await Product.findById(res.body.data.product.id);
    assert.equal(String(stored.seller), String(sellerA.user._id));
    assert.equal(stored.averageRating, 0);
    assert.equal(stored.reviewCount, 0);
    assert.equal(stored.soldCount, 0);
    assert.equal(stored.finalPrice, 399900);
  });

  it('rejects invalid input', async () => {
    const base = productPayload(sellerA.user, electronics._id);
    const cases = {
      'discount not below price': { discountPrice: 499900 },
      'fractional paise': { price: 100.5 },
      'negative stock': { stock: -1 },
      'price too low': { price: 50 },
      'markup in name': { name: '<script>alert(1)</script>' },
      'no images': { images: [] },
      'too many images': {
        images: Array.from({ length: 7 }, (_, i) => ({
          url: `https://res.cloudinary.com/testcloud/image/upload/v1/shopsphere/products/${sellerA.user._id}/i${i}.png`,
          publicId: `shopsphere/products/${sellerA.user._id}/i${i}`,
        })),
      },
      'image from another host': {
        images: [{ url: 'https://evil.example.com/x.png', publicId: `shopsphere/products/${sellerA.user._id}/x` }],
      },
    };
    for (const [label, override] of Object.entries(cases)) {
      const res = await sellerA.post('/api/products', { ...base, ...override });
      assert.equal(res.status, 400, label);
    }
  });

  it("refuses images that were uploaded by a different seller", async () => {
    const stolen = productPayload(sellerB.user, electronics._id); // images live in B's folder
    const res = await sellerA.post('/api/products', stolen);
    assert.equal(res.status, 400);
    assert.match(res.body.message, /do not belong/);
  });

  it('rejects an unknown category', async () => {
    const res = await sellerA.post('/api/products', productPayload(sellerA.user, '64b7f0f0f0f0f0f0f0f0f0f0'));
    assert.equal(res.status, 400);
  });
});

describe('ownership: PATCH / DELETE', () => {
  let productId;
  beforeEach(async () => {
    const res = await sellerA.post('/api/products', productPayload(sellerA.user, electronics._id));
    productId = res.body.data.product.id;
  });

  it("another seller cannot edit or delete a product (404, not 403)", async () => {
    const patch = await sellerB.patch(`/api/products/${productId}`, { price: 1 + 99 });
    assert.equal(patch.status, 404);
    const del = await sellerB.delete(`/api/products/${productId}`);
    assert.equal(del.status, 404);

    const stored = await Product.findById(productId);
    assert.equal(stored.price, 499900);
    assert.equal(stored.status, 'active');
  });

  it('the owner can update; finalPrice follows and discount can be cleared', async () => {
    const up = await sellerA.patch(`/api/products/${productId}`, { price: 600000, discountPrice: 450000, stock: 7 });
    assert.equal(up.status, 200);
    assert.equal(up.body.data.product.finalPrice, 450000);
    assert.equal(up.body.data.product.stock, 7);

    const cleared = await sellerA.patch(`/api/products/${productId}`, { discountPrice: null });
    assert.equal(cleared.body.data.product.finalPrice, 600000);
    assert.equal(cleared.body.data.product.discountPrice, null);
  });

  it('rejects lowering the price below an existing discount', async () => {
    const res = await sellerA.patch(`/api/products/${productId}`, { price: 300000 }); // discount is 399900
    assert.equal(res.status, 400);
  });

  it('soft-deletes: hidden from shoppers and from the seller list, but kept in the database', async () => {
    const del = await sellerA.delete(`/api/products/${productId}`);
    assert.equal(del.status, 200);

    assert.equal((await request(app).get(`/api/products/${productId}`)).status, 404);
    const mine = await sellerA.get('/api/sellers/products');
    assert.equal(mine.body.data.products.length, 0);
    assert.equal((await sellerA.patch(`/api/products/${productId}`, { stock: 1 })).status, 404);

    assert.equal((await Product.findById(productId)).status, 'deleted');
  });

  it('a product removed by an admin cannot be edited by the seller', async () => {
    await Product.updateOne({ _id: productId }, { moderationStatus: 'removed' });
    const res = await sellerA.patch(`/api/products/${productId}`, { stock: 1 });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'PRODUCT_REMOVED');
  });
});

describe('public visibility', () => {
  it('shows only active + approved products in the list and on the detail page', async () => {
    const visible = await insert({ name: 'Visible Item' });
    const inactive = await insert({ name: 'Inactive Item', status: 'inactive' });
    const removed = await insert({ name: 'Removed Item', moderationStatus: 'removed' });
    const deleted = await insert({ name: 'Deleted Item', status: 'deleted' });

    const list = await request(app).get('/api/products');
    assert.deepEqual(list.body.data.products.map((p) => p.name), ['Visible Item']);

    assert.equal((await request(app).get(`/api/products/${visible._id}`)).status, 200);
    for (const hidden of [inactive, removed, deleted]) {
      assert.equal((await request(app).get(`/api/products/${hidden._id}`)).status, 404);
    }
  });

  it('exposes seller info but no internal moderation or inventory fields', async () => {
    const p = await insert();
    const res = await request(app).get(`/api/products/${p._id}`);
    const body = res.body.data.product;
    assert.equal(body.store.storeName, 'Store A');
    assert.equal(body.moderationStatus, undefined);
    assert.equal(body.status, undefined);
    assert.equal(body.images[0].publicId, undefined);
  });

  it('rejects malformed ids with 400', async () => {
    assert.equal((await request(app).get('/api/products/not-an-id')).status, 400);
  });
});

describe('GET /api/products (search, filter, sort, paginate)', () => {
  beforeEach(async () => {
    await insert({ name: 'Wireless Earbuds', brand: 'Auralis', tags: ['audio'], price: 300000, stock: 5, averageRating: 4.5, soldCount: 50 });
    await insert({ name: 'Wired Keyboard', brand: 'Typo', price: 150000, discountPrice: 100000, stock: 0, averageRating: 3.2, soldCount: 90 });
    await insert({ name: 'Smart Watch', brand: 'Pulse', price: 900000, stock: 12, averageRating: 4.9, soldCount: 10 });
    await insert({ name: 'Novel of the Sea', brand: 'Lantern', category: books._id, price: 40000, stock: 100, averageRating: 4.0, soldCount: 200 });
  });

  const names = (res) => res.body.data.products.map((p) => p.name);

  it('filters by category slug', async () => {
    const res = await request(app).get('/api/products?category=books');
    assert.deepEqual(names(res), ['Novel of the Sea']);
    assert.deepEqual(names(await request(app).get('/api/products?category=nope')), []);
  });

  it('filters by price (using the discounted final price)', async () => {
    const res = await request(app).get('/api/products?minPrice=90000&maxPrice=200000&sort=price_asc');
    assert.deepEqual(names(res), ['Wired Keyboard']); // 1000 Rs after discount
  });

  it('filters by minimum rating and by availability', async () => {
    assert.deepEqual(names(await request(app).get('/api/products?minRating=4.5&sort=rating')), ['Smart Watch', 'Wireless Earbuds']);
    const inStock = await request(app).get('/api/products?inStock=true&limit=48');
    assert.ok(!names(inStock).includes('Wired Keyboard'));
    assert.equal(names(inStock).length, 3);
  });

  it('searches by name, brand and tags with relevance ranking', async () => {
    assert.deepEqual(names(await request(app).get('/api/products?q=wireless')), ['Wireless Earbuds']);
    assert.deepEqual(names(await request(app).get('/api/products?q=pulse')), ['Smart Watch']); // brand
    assert.deepEqual(names(await request(app).get('/api/products?q=audio')), ['Wireless Earbuds']); // tag
    assert.deepEqual(names(await request(app).get('/api/products?q=zzzzzz')), []);
  });

  it('sorts by price, rating and popularity', async () => {
    assert.deepEqual(names(await request(app).get('/api/products?sort=price_asc')), [
      'Novel of the Sea', 'Wired Keyboard', 'Wireless Earbuds', 'Smart Watch',
    ]);
    assert.equal(names(await request(app).get('/api/products?sort=price_desc'))[0], 'Smart Watch');
    assert.equal(names(await request(app).get('/api/products?sort=rating'))[0], 'Smart Watch');
    assert.equal(names(await request(app).get('/api/products?sort=popularity'))[0], 'Novel of the Sea');
  });

  it('paginates with consistent metadata and no overlap between pages', async () => {
    const p1 = await request(app).get('/api/products?sort=price_asc&limit=3&page=1');
    const p2 = await request(app).get('/api/products?sort=price_asc&limit=3&page=2');

    assert.deepEqual(p1.body.meta, { page: 1, limit: 3, total: 4, totalPages: 2, hasNext: true, hasPrev: false });
    assert.equal(p2.body.meta.hasNext, false);
    assert.equal(names(p2).length, 1);
    assert.equal(new Set([...names(p1), ...names(p2)]).size, 4);
  });

  it('validates query parameters', async () => {
    for (const qs of ['limit=1000', 'page=0', 'sort=cheapest', 'minPrice=500&maxPrice=100', 'minRating=9', 'inStock=maybe']) {
      assert.equal((await request(app).get(`/api/products?${qs}`)).status, 400, qs);
    }
  });

  it('ignores NoSQL operators smuggled into the query string', async () => {
    const res = await request(app).get('/api/products?category[$ne]=books');
    assert.equal(res.status, 400); // stripped to an object, which is not a valid string
  });

  it('never returns descriptions in list cards', async () => {
    const res = await request(app).get('/api/products');
    assert.equal(res.body.data.products[0].description, undefined);
  });
});

describe('GET /api/products/suggestions', () => {
  it('suggests products by name prefix and categories', async () => {
    await insert({ name: 'Wireless Earbuds' });
    await insert({ name: 'Wired Keyboard' });
    await insert({ name: 'Smart Watch' });

    const res = await request(app).get('/api/products/suggestions?q=wire');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.products.map((p) => p.name).sort(), ['Wired Keyboard', 'Wireless Earbuds']);

    const cat = await request(app).get('/api/products/suggestions?q=elec');
    assert.deepEqual(cat.body.data.categories.map((c) => c.slug), ['electronics']);
  });

  it('requires at least 2 characters and treats regex characters literally', async () => {
    assert.equal((await request(app).get('/api/products/suggestions?q=a')).status, 400);
    const res = await request(app).get('/api/products/suggestions?q=.*');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.products.length, 0);
  });
});

describe('GET /api/sellers/products (my products)', () => {
  it('lists only my products, including inactive ones, with seller-only fields', async () => {
    await insert({ name: 'Mine Active' });
    await insert({ name: 'Mine Inactive', status: 'inactive', stock: 2 });
    await insert({ name: 'Theirs', seller: sellerB.user._id, store: sellerB.store._id });

    const res = await sellerA.get('/api/sellers/products');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.products.map((p) => p.name).sort(), ['Mine Active', 'Mine Inactive']);
    assert.ok(res.body.data.products.every((p) => 'moderationStatus' in p && 'isLowStock' in p));

    const onlyInactive = await sellerA.get('/api/sellers/products?status=inactive');
    assert.deepEqual(onlyInactive.body.data.products.map((p) => p.name), ['Mine Inactive']);
  });

  it("cannot open another seller's product through the seller endpoint", async () => {
    const theirs = await insert({ seller: sellerB.user._id, store: sellerB.store._id });
    assert.equal((await sellerA.get(`/api/sellers/products/${theirs._id}`)).status, 404);
    assert.equal((await sellerB.get(`/api/sellers/products/${theirs._id}`)).status, 200);
  });

  it('is closed to customers and anonymous users', async () => {
    assert.equal((await request(app).get('/api/sellers/products')).status, 401);
    const customer = await createCustomerClient(app);
    assert.equal((await customer.get('/api/sellers/products')).status, 403);
  });
});

describe('POST /api/sellers/products/images (upload)', () => {
  const upload = (client, files) => {
    let req = client.agent.post('/api/sellers/products/images').set('X-CSRF-Token', client.csrf);
    for (const f of files) req = req.attach('images', f.buffer, { filename: f.name, contentType: f.type });
    return req;
  };
  const png = (name = 'a.png') => ({ buffer: PNG_BYTES, name, type: 'image/png' });

  it('uploads valid images into the seller\'s own folder', async () => {
    const res = await upload(sellerA, [png('a.png'), png('b.png')]);
    assert.equal(res.status, 201);
    assert.equal(res.body.data.images.length, 2);
    for (const img of res.body.data.images) {
      assert.ok(img.publicId.startsWith(`shopsphere/products/${sellerA.user._id}/`));
      assert.ok(img.url.startsWith('https://res.cloudinary.com/testcloud/'));
    }
  });

  it('uploaded images can be used to create a product', async () => {
    const up = await upload(sellerA, [png()]);
    const res = await sellerA.post('/api/products', {
      ...productPayload(sellerA.user, electronics._id),
      images: up.body.data.images,
    });
    assert.equal(res.status, 201);
  });

  it('rejects a file whose bytes are not an image even if it claims to be a PNG', async () => {
    const res = await upload(sellerA, [{ buffer: FAKE_PNG_TEXT, name: 'evil.png', type: 'image/png' }]);
    assert.equal(res.status, 400);
    assert.match(res.body.message, /not a valid/);
  });

  it('rejects other file types, too many files and empty requests', async () => {
    const pdf = await upload(sellerA, [{ buffer: Buffer.from('%PDF-1.4 ...'), name: 'x.pdf', type: 'application/pdf' }]);
    assert.equal(pdf.status, 400);

    const seven = await upload(sellerA, Array.from({ length: 7 }, (_, i) => png(`${i}.png`)));
    assert.equal(seven.status, 400);

    const none = await sellerA.agent.post('/api/sellers/products/images').set('X-CSRF-Token', sellerA.csrf);
    assert.equal(none.status, 400);
  });

  it('rejects files over 5 MB', async () => {
    const big = Buffer.concat([PNG_BYTES, Buffer.alloc(5 * 1024 * 1024 + 10)]);
    const res = await upload(sellerA, [{ buffer: big, name: 'big.png', type: 'image/png' }]);
    assert.equal(res.status, 413);
  });

  it('is closed to customers, anonymous users and unapproved sellers', async () => {
    const customer = await createCustomerClient(app);
    assert.equal((await upload(customer, [png()])).status, 403);

    const pending = await createSellerClient(app, { email: 'p@example.com', storeName: 'Pending', status: 'pending' });
    assert.equal((await upload(pending, [png()])).status, 403);

    const anon = await createClient(app);
    assert.equal((await upload(anon, [png()])).status, 401);
  });
});

describe('GET /api/categories', () => {
  it('lists active categories only', async () => {
    await Category.create({ name: 'Hidden', isActive: false });
    const res = await request(app).get('/api/categories');
    assert.deepEqual(res.body.data.categories.map((c) => c.slug).sort(), ['books', 'electronics']);
  });
});
