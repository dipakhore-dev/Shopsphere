import './helpers/env.js';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import request from 'supertest';
import { startTestDb, stopTestDb, clearDb } from './helpers/db.js';
import { createClient, validUser } from './helpers/client.js';
import { createSellerClient } from './helpers/seller.js';
import { addToCart, createShopper, placeOrder } from './helpers/shopper.js';

const { default: app } = await import('../src/app.js');
const { User } = await import('../src/models/User.js');
const { Category } = await import('../src/models/Category.js');
const { Product } = await import('../src/models/Product.js');
const { Order } = await import('../src/models/Order.js');
const { outbox, simulateEmailFailure } = await import('../src/services/email.service.js');

const REG = '/api/auth/register';
const VERIFY = '/api/auth/verify-email';
const RESEND = '/api/auth/resend-verification';
const STATUS = '/api/auth/verification-status';
const TTL_MS = 30 * 60 * 1000;

const tokenFromEmail = (mail) => mail.text.match(/token=([A-Za-z0-9_-]+)/)[1];
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stored = (email) => User.findOne({ email }).select('+emailVerificationTokenHash +emailVerificationExpires').lean();

/** Pretend the last email was sent 10 minutes ago, so the resend cooldown has passed. */
const passCooldown = (email) => User.updateOne({ email }, { emailVerificationExpires: new Date(Date.now() + TTL_MS - 10 * 60 * 1000) });
const expireToken = (email) => User.updateOne({ email }, { emailVerificationExpires: new Date(Date.now() - 1000) });

async function registerClient(email = 'asha@example.com') {
  const client = await createClient(app);
  const res = await client.post(REG, validUser({ email }));
  return { client, res, email };
}

before(startTestDb);
after(stopTestDb);
beforeEach(async () => {
  await clearDb();
  outbox.length = 0;
  simulateEmailFailure(false);
});

describe('registration creates a verification token and sends an email', () => {
  it('stores only the SHA-256 hash, expiring in 30 minutes, and never returns the token', async () => {
    const { res, email } = await registerClient();
    assert.equal(res.status, 201);
    assert.equal(res.body.data.verificationEmail, 'sent');

    const token = tokenFromEmail(outbox[0]);
    const user = await stored(email);
    assert.equal(user.isEmailVerified, false);
    assert.equal(user.emailVerificationTokenHash, sha256(token));
    assert.notEqual(user.emailVerificationTokenHash, token);

    const ttl = user.emailVerificationExpires.getTime() - Date.now();
    assert.ok(ttl > 29 * 60 * 1000 && ttl <= TTL_MS, `expiry should be ~30 minutes away, was ${ttl} ms`);
    assert.ok(!JSON.stringify(res.body).includes(token), 'the raw token must never appear in an API response');
  });

  it('delivers one email to the registered address (captured by the test transport)', async () => {
    await registerClient('asha@example.com');
    assert.equal(outbox.length, 1);
    assert.equal(outbox[0].to, 'asha@example.com');
    assert.match(outbox[0].text, /\/verify-email\?token=/);
    assert.match(outbox[0].text, /30 minutes/);
  });
});

describe('POST /api/auth/verify-email', () => {
  it('verifies the account, clears the token and keeps the session valid', async () => {
    const { client, email } = await registerClient();
    const res = await client.post(VERIFY, { token: tokenFromEmail(outbox[0]) });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.isEmailVerified, true);

    const user = await stored(email);
    assert.equal(user.isEmailVerified, true);
    assert.equal(user.emailVerificationTokenHash, undefined);
    assert.equal(user.emailVerificationExpires, undefined);

    const me = await client.get('/api/auth/me'); // same cookies still work
    assert.equal(me.status, 200);
    assert.equal(me.body.data.user.isEmailVerified, true);
  });

  it('works in a different browser where the user is not logged in', async () => {
    await registerClient();
    const otherBrowser = await createClient(app);
    assert.equal((await otherBrowser.post(VERIFY, { token: tokenFromEmail(outbox[0]) })).status, 200);
  });

  it('rejects an unknown token and a malformed one', async () => {
    const { client } = await registerClient();
    const unknown = await client.post(VERIFY, { token: crypto.randomBytes(48).toString('base64url') });
    assert.equal(unknown.status, 400);
    assert.equal(unknown.body.code, 'VERIFICATION_TOKEN_INVALID');
    assert.equal((await client.post(VERIFY, { token: 'short' })).status, 400);
    assert.equal((await client.post(VERIFY, {})).status, 400);
  });

  it('rejects an expired token with a distinct error, and the user can recover with a resend', async () => {
    const { client, email } = await registerClient();
    const oldToken = tokenFromEmail(outbox[0]);
    await expireToken(email);

    const res = await client.post(VERIFY, { token: oldToken });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VERIFICATION_TOKEN_EXPIRED');
    assert.equal((await stored(email)).isEmailVerified, false);

    outbox.length = 0;
    assert.equal((await client.post(RESEND, {})).status, 200);
    assert.equal((await client.post(VERIFY, { token: tokenFromEmail(outbox[0]) })).status, 200);
  });

  it('is single-use, and a used token cannot verify another account', async () => {
    const a = await registerClient('a@example.com');
    const tokenA = tokenFromEmail(outbox[0]);
    const b = await registerClient('b@example.com');

    assert.equal((await a.client.post(VERIFY, { token: tokenA })).status, 200);

    const reuse = await b.client.post(VERIFY, { token: tokenA });
    assert.equal(reuse.status, 400);
    assert.equal(reuse.body.code, 'VERIFICATION_TOKEN_INVALID');
    assert.equal((await stored('b@example.com')).isEmailVerified, false);
    assert.equal((await b.client.post(VERIFY, { token: tokenA })).status, 400);
  });

  it('two simultaneous requests with the same link: exactly one succeeds', async () => {
    const { client, email } = await registerClient();
    const token = tokenFromEmail(outbox[0]);
    const results = await Promise.all([client.post(VERIFY, { token }), client.post(VERIFY, { token })]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
    assert.equal((await stored(email)).isEmailVerified, true);
  });

  it('still requires the CSRF token', async () => {
    await registerClient();
    const res = await request(app).post(VERIFY).send({ token: tokenFromEmail(outbox[0]) });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'CSRF_INVALID');
  });
});

describe('POST /api/auth/resend-verification (logged in)', () => {
  it('sends a new email and invalidates the previous token', async () => {
    const { client } = await registerClient();
    const oldToken = tokenFromEmail(outbox[0]);
    await passCooldown('asha@example.com');
    outbox.length = 0;

    const res = await client.post(RESEND, {});
    assert.equal(res.status, 200);
    assert.equal(res.body.data.delivery, 'sent');
    assert.equal(res.body.data.cooldownSeconds, 60);
    assert.equal(outbox.length, 1);

    const newToken = tokenFromEmail(outbox[0]);
    assert.notEqual(newToken, oldToken);
    assert.equal((await client.post(VERIFY, { token: oldToken })).status, 400); // replaced
    assert.equal((await client.post(VERIFY, { token: newToken })).status, 200);
  });

  it('enforces the cooldown: no email is sent and the wait time is reported', async () => {
    const { client } = await registerClient(); // registration already sent one email
    outbox.length = 0;

    const res = await client.post(RESEND, {});
    assert.equal(res.status, 429);
    assert.equal(res.body.code, 'RESEND_COOLDOWN');
    assert.ok(res.body.details.retryAfterSeconds >= 1 && res.body.details.retryAfterSeconds <= 60);
    assert.ok(Number(res.headers['retry-after']) >= 1);
    assert.equal(outbox.length, 0);
  });

  it('two simultaneous resends send only ONE email', async () => {
    const { client } = await registerClient();
    await passCooldown('asha@example.com');
    outbox.length = 0;

    const results = await Promise.all([client.post(RESEND, {}), client.post(RESEND, {})]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 429]);
    assert.equal(outbox.length, 1);
  });

  it('refuses already-verified users and sends nothing', async () => {
    const { client } = await registerClient();
    await client.post(VERIFY, { token: tokenFromEmail(outbox[0]) });
    outbox.length = 0;

    const res = await client.post(RESEND, {});
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'ALREADY_VERIFIED');
    assert.equal(outbox.length, 0);
    assert.equal((await stored('asha@example.com')).emailVerificationTokenHash, undefined);
  });

  it('a token issued under the old 24-hour rule never blocks a resend', async () => {
    const { client } = await registerClient();
    await User.updateOne({ email: 'asha@example.com' }, { emailVerificationExpires: new Date(Date.now() + 23 * 60 * 60 * 1000) });
    outbox.length = 0;

    assert.equal((await client.get(STATUS)).body.data.cooldownSeconds, 0);
    assert.equal((await client.post(RESEND, {})).status, 200);
    assert.equal(outbox.length, 1);
  });

  it('keeps the CSRF requirement', async () => {
    const { client } = await registerClient();
    const res = await client.agent.post(RESEND).send({}); // no X-CSRF-Token header
    assert.equal(res.status, 403);
  });
});

describe('GET /api/auth/verification-status', () => {
  it('requires login and reports the address and the remaining cooldown', async () => {
    assert.equal((await request(app).get(STATUS)).status, 401);

    const { client } = await registerClient();
    const fresh = (await client.get(STATUS)).body.data;
    assert.equal(fresh.email, 'asha@example.com');
    assert.equal(fresh.isEmailVerified, false);
    assert.ok(fresh.cooldownSeconds > 0 && fresh.cooldownSeconds <= 60);

    await passCooldown('asha@example.com');
    assert.equal((await client.get(STATUS)).body.data.cooldownSeconds, 0);

    await client.post(VERIFY, { token: tokenFromEmail(outbox[0]) });
    assert.equal((await client.get(STATUS)).body.data.isEmailVerified, true);
  });
});

describe('resend while logged out (no email enumeration)', () => {
  it('gives the identical answer for unverified, verified and unknown addresses; emails only the unverified', async () => {
    const real = await registerClient('real@example.com');
    const done = await registerClient('done@example.com');
    await done.client.post(VERIFY, { token: tokenFromEmail(outbox[1]) });
    await passCooldown('real@example.com');
    outbox.length = 0;

    const anon = await createClient(app);
    const answers = [];
    for (const email of ['real@example.com', 'done@example.com', 'ghost@example.com']) {
      const res = await anon.post(RESEND, { email });
      assert.equal(res.status, 200, email);
      answers.push(res.body.message);
    }
    assert.equal(new Set(answers).size, 1, 'every address must get the same message');
    assert.equal(outbox.length, 1);
    assert.equal(outbox[0].to, 'real@example.com');
    assert.ok(real.res.status === 201);
  });

  it('silently respects the cooldown and needs an email when logged out', async () => {
    await registerClient('real@example.com');
    outbox.length = 0;
    const anon = await createClient(app);

    const tooSoon = await anon.post(RESEND, { email: 'real@example.com' });
    assert.equal(tooSoon.status, 200); // same answer, but...
    assert.equal(outbox.length, 0); // ...no second email

    const noEmail = await anon.post(RESEND, {});
    assert.equal(noEmail.status, 401);
  });
});

describe('when email delivery fails', () => {
  it('registration still succeeds, no token is left behind, and a retry is allowed immediately', async () => {
    simulateEmailFailure(true);
    const { client, res, email } = await registerClient();
    assert.equal(res.status, 201);
    assert.equal(res.body.data.verificationEmail, 'failed');
    assert.equal(outbox.length, 0);
    assert.equal((await stored(email)).emailVerificationTokenHash, undefined);

    const failed = await client.post(RESEND, {});
    assert.equal(failed.status, 503);
    assert.equal(failed.body.code, 'EMAIL_DELIVERY_FAILED');

    simulateEmailFailure(false);
    const retry = await client.post(RESEND, {}); // no cooldown was consumed by the failed attempts
    assert.equal(retry.status, 200);
    assert.equal(outbox.length, 1);
  });
});

describe('integration with COD checkout', () => {
  it('unverified customers cannot order; after verifying by email link they can', async () => {
    const category = await Category.create({ name: 'Electronics' });
    const seller = await createSellerClient(app, { email: 'seller@example.com', storeName: 'Store S' });
    const product = await Product.create({
      seller: seller.user._id, store: seller.store._id, name: 'Sample Product',
      description: 'A perfectly fine sample product for tests.', category: category._id, brand: 'Acme',
      price: 100000, stock: 5, images: [{ url: 'https://example.com/x.png' }],
    });
    outbox.length = 0;

    const buyer = await createShopper(app, { email: 'buyer@example.com', verified: false });
    await addToCart(buyer, product, 1);
    const body = { addressId: buyer.address.id, paymentMethod: 'cod' };

    const blocked = await placeOrder(buyer, body);
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.code, 'EMAIL_NOT_VERIFIED');
    assert.equal(await Order.countDocuments(), 0);
    assert.equal((await Product.findById(product._id)).stock, 5);

    const mail = outbox.find((m) => m.to === 'buyer@example.com');
    assert.equal((await buyer.post(VERIFY, { token: tokenFromEmail(mail) })).status, 200);

    const placed = await placeOrder(buyer, body);
    assert.equal(placed.status, 201);
    assert.equal((await Product.findById(product._id)).stock, 4);
    assert.equal((await buyer.get('/api/auth/me')).status, 200); // the session survived verification
  });
});
