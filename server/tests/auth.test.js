import './helpers/env.js';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startTestDb, stopTestDb, clearDb } from './helpers/db.js';
import { createClient, getSetCookie, refreshWith, validUser } from './helpers/client.js';

const { default: app } = await import('../src/app.js');
const { User } = await import('../src/models/User.js');
const { RefreshSession } = await import('../src/models/RefreshSession.js');
const { outbox } = await import('../src/services/email.service.js');

const REG = '/api/auth/register';
const LOGIN = '/api/auth/login';
const ME = '/api/auth/me';
const REFRESH = '/api/auth/refresh';

const tokenFromEmail = (email) => email.text.match(/token=([A-Za-z0-9_-]+)/)[1];

before(startTestDb);
after(stopTestDb);
beforeEach(async () => {
  await clearDb();
  outbox.length = 0;
});

describe('CSRF protection', () => {
  it('rejects unsafe requests without a CSRF token', async () => {
    const res = await request(app).post(LOGIN).send({ email: 'a@b.co', password: 'x' });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'CSRF_INVALID');
  });

  it('rejects a header that does not match the cookie', async () => {
    const c = await createClient(app);
    const res = await c.agent.post(LOGIN).set('X-CSRF-Token', 'x'.repeat(43)).send({ email: 'a@b.co', password: 'x' });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'CSRF_INVALID');
  });

  it('returns a stable token for the same browser', async () => {
    const c = await createClient(app);
    const again = await c.get('/api/auth/csrf');
    assert.equal(again.body.data.csrfToken, c.csrf);
  });
});

describe('POST /api/auth/register', () => {
  it('creates a customer, hashes the password and sets HttpOnly cookies', async () => {
    const c = await createClient(app);
    const res = await c.post(REG, validUser());

    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.email, 'asha@example.com');
    assert.equal(res.body.data.user.role, 'customer');
    assert.equal(res.body.data.user.password, undefined);
    assert.equal(res.body.data.accessToken, undefined, 'tokens must never be in the JSON body');

    const cookies = res.headers['set-cookie'];
    const access = cookies.find((x) => x.startsWith('accessToken='));
    const refresh = cookies.find((x) => x.startsWith('refreshToken='));
    assert.match(access, /HttpOnly/i);
    assert.match(refresh, /HttpOnly/i);
    assert.match(refresh, /Path=\/api\/auth/);

    const stored = await User.findOne({ email: 'asha@example.com' }).select('+password');
    assert.notEqual(stored.password, 'Passw0rd!x');
    assert.match(stored.password, /^\$2[aby]\$/);
  });

  it('ignores a client-supplied role (no privilege escalation)', async () => {
    const c = await createClient(app);
    const res = await c.post(REG, { ...validUser(), role: 'admin', status: 'active', isEmailVerified: true });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.role, 'customer');
    assert.equal(res.body.data.user.isEmailVerified, false);
  });

  it('validates input', async () => {
    const c = await createClient(app);
    for (const bad of [
      { password: 'short1' },
      { password: 'allletters' },
      { password: '12345678' },
      { email: 'not-an-email' },
      { name: 'A' },
      { name: '<script>x</script>' },
    ]) {
      const res = await c.post(REG, validUser(bad));
      assert.equal(res.status, 400, JSON.stringify(bad));
    }
  });

  it('rejects a duplicate email (case-insensitive)', async () => {
    const c = await createClient(app);
    await c.post(REG, validUser());
    const res = await c.post(REG, validUser({ email: 'ASHA@Example.com' }));
    assert.equal(res.status, 409);
  });

  it('sends a verification email', async () => {
    const c = await createClient(app);
    await c.post(REG, validUser());
    assert.equal(outbox.length, 1);
    assert.equal(outbox[0].to, 'asha@example.com');
    assert.match(outbox[0].text, /verify-email\?token=/);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    const c = await createClient(app);
    await c.post(REG, validUser());
  });

  it('logs in with correct credentials', async () => {
    const c = await createClient(app);
    const res = await c.post(LOGIN, { email: 'ASHA@example.com', password: 'Passw0rd!x' });
    assert.equal(res.status, 200);
    assert.ok(getSetCookie(res, 'accessToken'));
    assert.ok(getSetCookie(res, 'refreshToken'));
  });

  it('gives the same generic error for wrong password and unknown email', async () => {
    const c = await createClient(app);
    const wrongPw = await c.post(LOGIN, { email: 'asha@example.com', password: 'Wrong-pass1' });
    const unknown = await c.post(LOGIN, { email: 'nobody@example.com', password: 'Wrong-pass1' });
    assert.equal(wrongPw.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrongPw.body.message, unknown.body.message);
  });

  it('rejects NoSQL operator injection', async () => {
    const c = await createClient(app);
    const res = await c.post(LOGIN, { email: { $gt: '' }, password: { $gt: '' } });
    assert.equal(res.status, 400);
  });

  it('locks the account after 5 failed attempts', async () => {
    const c = await createClient(app);
    for (let i = 0; i < 5; i += 1) {
      const res = await c.post(LOGIN, { email: 'asha@example.com', password: 'Wrong-pass1' });
      assert.equal(res.status, 401);
    }
    const locked = await c.post(LOGIN, { email: 'asha@example.com', password: 'Passw0rd!x' });
    assert.equal(locked.status, 429);
    assert.equal(locked.body.code, 'ACCOUNT_LOCKED');
  });

  it('blocks suspended accounts from logging in and from using an existing session', async () => {
    const c = await createClient(app);
    await c.post(LOGIN, { email: 'asha@example.com', password: 'Passw0rd!x' });
    assert.equal((await c.get(ME)).status, 200);

    await User.updateOne({ email: 'asha@example.com' }, { status: 'suspended' });

    const me = await c.get(ME);
    assert.equal(me.status, 403);
    assert.equal(me.body.code, 'ACCOUNT_SUSPENDED');

    const c2 = await createClient(app);
    const login = await c2.post(LOGIN, { email: 'asha@example.com', password: 'Passw0rd!x' });
    assert.equal(login.status, 403);
  });
});

describe('GET /api/auth/me', () => {
  it('requires authentication', async () => {
    const res = await request(app).get(ME);
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'AUTH_REQUIRED');
  });

  it('returns the current user without sensitive fields', async () => {
    const c = await createClient(app);
    await c.post(REG, validUser());
    const res = await c.get(ME);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.email, 'asha@example.com');
    assert.equal(res.body.data.user.password, undefined);
    assert.equal(res.body.data.user.passwordResetTokenHash, undefined);
  });
});

describe('refresh-token rotation', () => {
  it('issues a new refresh token on every refresh', async () => {
    const c = await createClient(app);
    const reg = await c.post(REG, validUser());
    const first = getSetCookie(reg, 'refreshToken');

    const res = await c.post(REFRESH);
    assert.equal(res.status, 200);
    const second = getSetCookie(res, 'refreshToken');
    assert.ok(second);
    assert.notEqual(second, first);
    assert.equal(await RefreshSession.countDocuments({ revokedReason: 'rotated' }), 1);
  });

  it('rejects an immediately replayed token but keeps the session alive (two-tab race)', async () => {
    const c = await createClient(app);
    const reg = await c.post(REG, validUser());
    const old = getSetCookie(reg, 'refreshToken');
    await c.post(REFRESH);

    const replay = await refreshWith(app, c.csrf, old);
    assert.equal(replay.status, 401);

    const stillOk = await c.post(REFRESH); // the browser's newest token still works
    assert.equal(stillOk.status, 200);
  });

  it('revokes the whole token family when an old token is replayed later (theft detection)', async () => {
    const c = await createClient(app);
    const reg = await c.post(REG, validUser());
    const old = getSetCookie(reg, 'refreshToken');
    await c.post(REFRESH);

    // Pretend the rotation happened a minute ago, i.e. outside the grace window.
    await RefreshSession.updateMany({ revokedReason: 'rotated' }, { revokedAt: new Date(Date.now() - 60_000) });

    const replay = await refreshWith(app, c.csrf, old);
    assert.equal(replay.status, 401);

    // The legitimate (newest) token is now dead as well.
    const legit = await c.post(REFRESH);
    assert.equal(legit.status, 401);
    assert.equal(await RefreshSession.countDocuments({ revokedAt: { $exists: false } }), 0);
  });

  it('rejects a missing or unknown refresh token', async () => {
    const c = await createClient(app);
    assert.equal((await c.post(REFRESH)).status, 401);
    assert.equal((await refreshWith(app, c.csrf, 'garbage')).status, 401);
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes the session and clears cookies', async () => {
    const c = await createClient(app);
    await c.post(REG, validUser());

    const res = await c.post('/api/auth/logout');
    assert.equal(res.status, 200);
    assert.match(res.headers['set-cookie'].join(';'), /accessToken=;/);
    assert.equal(await RefreshSession.countDocuments({ revokedAt: { $exists: false } }), 0);

    assert.equal((await c.get(ME)).status, 401);
    assert.equal((await c.post(REFRESH)).status, 401);
  });
});

describe('email verification', () => {
  it('verifies the email once, with a valid token', async () => {
    const c = await createClient(app);
    await c.post(REG, validUser());
    const token = tokenFromEmail(outbox[0]);

    const ok = await c.post('/api/auth/verify-email', { token });
    assert.equal(ok.status, 200);
    assert.equal((await User.findOne({ email: 'asha@example.com' })).isEmailVerified, true);

    const reuse = await c.post('/api/auth/verify-email', { token });
    assert.equal(reuse.status, 400);
  });

  it('rejects an invalid token', async () => {
    const c = await createClient(app);
    const res = await c.post('/api/auth/verify-email', { token: 'x'.repeat(40) });
    assert.equal(res.status, 400);
  });

  it('resend requires login and refuses once verified', async () => {
    const anon = await createClient(app);
    assert.equal((await anon.post('/api/auth/resend-verification')).status, 401);

    const c = await createClient(app);
    await c.post(REG, validUser());
    outbox.length = 0;
    assert.equal((await c.post('/api/auth/resend-verification')).status, 200);
    assert.equal(outbox.length, 1);

    await c.post('/api/auth/verify-email', { token: tokenFromEmail(outbox[0]) });
    assert.equal((await c.post('/api/auth/resend-verification')).status, 409);
  });
});

describe('forgot / reset password', () => {
  it('does not reveal whether an email is registered', async () => {
    const c = await createClient(app);
    await c.post(REG, validUser());
    outbox.length = 0;

    const known = await c.post('/api/auth/forgot-password', { email: 'asha@example.com' });
    const unknown = await c.post('/api/auth/forgot-password', { email: 'ghost@example.com' });
    assert.equal(known.status, 200);
    assert.equal(unknown.status, 200);
    assert.equal(known.body.message, unknown.body.message);
    assert.equal(outbox.length, 1, 'only the real account receives an email');
  });

  it('resets the password, signs out every session and makes the token single-use', async () => {
    const browser = await createClient(app);
    await browser.post(REG, validUser());
    outbox.length = 0;

    const c = await createClient(app);
    await c.post('/api/auth/forgot-password', { email: 'asha@example.com' });
    const token = tokenFromEmail(outbox[0]);

    const weak = await c.post('/api/auth/reset-password', { token, password: 'short' });
    assert.equal(weak.status, 400);

    const ok = await c.post('/api/auth/reset-password', { token, password: 'NewPassw0rd!' });
    assert.equal(ok.status, 200);

    // The old browser session was revoked everywhere.
    assert.equal((await browser.post(REFRESH)).status, 401);

    // Old password no longer works, new one does.
    const oldLogin = await c.post(LOGIN, { email: 'asha@example.com', password: 'Passw0rd!x' });
    assert.equal(oldLogin.status, 401);
    const newLogin = await c.post(LOGIN, { email: 'asha@example.com', password: 'NewPassw0rd!' });
    assert.equal(newLogin.status, 200);

    const reuse = await c.post('/api/auth/reset-password', { token, password: 'AnotherPassw0rd' });
    assert.equal(reuse.status, 400);
  });
});
