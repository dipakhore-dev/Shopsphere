import './helpers/env.js';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { startTestDb, stopTestDb, clearDb } from './helpers/db.js';

const { User } = await import('../src/models/User.js');
const { authenticate, authorize, requireVerifiedEmail } = await import('../src/middleware/auth.js');
const { signAccessToken } = await import('../src/services/token.service.js');
const { errorHandler } = await import('../src/middleware/errorHandler.js');

// A tiny app that exercises the real middleware on role-protected routes.
const mini = express();
mini.use(cookieParser());
const ok = (req, res) => res.json({ role: req.user.role });
mini.get('/customer-area', authenticate, ok);
mini.get('/seller-area', authenticate, authorize('seller', 'admin'), ok);
mini.get('/admin-area', authenticate, authorize('admin'), ok);
mini.get('/verified-area', authenticate, requireVerifiedEmail, ok);
mini.use(errorHandler);

const users = {};
const as = (user) => `accessToken=${signAccessToken(user)}`;

before(startTestDb);
after(stopTestDb);
beforeEach(async () => {
  await clearDb();
  const mk = (role, extra = {}) =>
    User.create({ name: `${role} user`, email: `${role}@example.com`, password: 'Passw0rd!x', role, ...extra });
  users.customer = await mk('customer');
  users.seller = await mk('seller', { isEmailVerified: true });
  users.admin = await mk('admin');
});

describe('authenticate', () => {
  it('rejects requests with no token', async () => {
    const res = await request(mini).get('/customer-area');
    assert.equal(res.status, 401);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const forged = jwt.sign({ role: 'admin' }, 'x'.repeat(48), {
      subject: String(users.customer._id),
      issuer: 'shopsphere',
      audience: 'shopsphere-web',
    });
    const res = await request(mini).get('/admin-area').set('Cookie', `accessToken=${forged}`);
    assert.equal(res.status, 401);
  });

  it('rejects an unsigned (alg: none) token', async () => {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: String(users.admin._id), role: 'admin' })}.`;
    const res = await request(mini).get('/admin-area').set('Cookie', `accessToken=${none}`);
    assert.equal(res.status, 401);
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign({ role: 'customer' }, process.env.JWT_ACCESS_SECRET, {
      subject: String(users.customer._id),
      issuer: 'shopsphere',
      audience: 'shopsphere-web',
      expiresIn: -10,
    });
    const res = await request(mini).get('/customer-area').set('Cookie', `accessToken=${expired}`);
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'TOKEN_EXPIRED');
  });

  it('rejects tokens issued before the last password change', async () => {
    const issuedAt = Math.floor(Date.now() / 1000) - 100; // issued 100 seconds ago
    const backdated = jwt.sign({ role: 'customer', iat: issuedAt }, process.env.JWT_ACCESS_SECRET, {
      subject: String(users.customer._id),
      issuer: 'shopsphere',
      audience: 'shopsphere-web',
      expiresIn: 600,
    });
    await User.updateOne({ _id: users.customer._id }, { passwordChangedAt: new Date() });

    const res = await request(mini).get('/customer-area').set('Cookie', `accessToken=${backdated}`);
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'TOKEN_REVOKED');
  });

  it('rejects a token whose user no longer exists', async () => {
    const cookie = as(users.customer);
    await User.deleteOne({ _id: users.customer._id });
    const res = await request(mini).get('/customer-area').set('Cookie', cookie);
    assert.equal(res.status, 401);
  });
});

describe('authorize (role-based access control)', () => {
  it('customer: allowed on customer area, 403 on seller and admin areas', async () => {
    const cookie = as(users.customer);
    assert.equal((await request(mini).get('/customer-area').set('Cookie', cookie)).status, 200);
    const seller = await request(mini).get('/seller-area').set('Cookie', cookie);
    assert.equal(seller.status, 403);
    assert.equal(seller.body.code, 'FORBIDDEN_ROLE');
    assert.equal((await request(mini).get('/admin-area').set('Cookie', cookie)).status, 403);
  });

  it('seller: allowed on seller area, 403 on admin area', async () => {
    const cookie = as(users.seller);
    assert.equal((await request(mini).get('/seller-area').set('Cookie', cookie)).status, 200);
    assert.equal((await request(mini).get('/admin-area').set('Cookie', cookie)).status, 403);
  });

  it('admin: allowed everywhere that lists admin', async () => {
    const cookie = as(users.admin);
    assert.equal((await request(mini).get('/seller-area').set('Cookie', cookie)).status, 200);
    assert.equal((await request(mini).get('/admin-area').set('Cookie', cookie)).status, 200);
  });

  it('uses the role stored in the database, not the one inside the token', async () => {
    const cookie = as(users.customer); // token says customer
    await User.updateOne({ _id: users.customer._id }, { role: 'admin' });
    assert.equal((await request(mini).get('/admin-area').set('Cookie', cookie)).status, 200);

    await User.updateOne({ _id: users.customer._id }, { role: 'customer' });
    assert.equal((await request(mini).get('/admin-area').set('Cookie', cookie)).status, 403);
  });
});

describe('requireVerifiedEmail', () => {
  it('blocks unverified users and allows verified ones', async () => {
    const blocked = await request(mini).get('/verified-area').set('Cookie', as(users.customer));
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.code, 'EMAIL_NOT_VERIFIED');
    assert.equal((await request(mini).get('/verified-area').set('Cookie', as(users.seller))).status, 200);
  });
});
