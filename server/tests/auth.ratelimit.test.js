import './helpers/env.js';
import { it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestDb, stopTestDb } from './helpers/db.js';
import { createClient } from './helpers/client.js';

const { default: app } = await import('../src/app.js');

before(async () => {
  await startTestDb();
  process.env.DISABLE_RATE_LIMIT = 'false'; // limiter is read per request
});
after(async () => {
  process.env.DISABLE_RATE_LIMIT = 'true';
  await stopTestDb();
});

it('rate-limits login attempts per IP (20 per 15 minutes)', async () => {
  const c = await createClient(app);
  const attempt = () => c.post('/api/auth/login', { email: 'ghost@example.com', password: 'Whatever1' });

  for (let i = 0; i < 20; i += 1) {
    assert.equal((await attempt()).status, 401);
  }
  const blocked = await attempt();
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.code, 'RATE_LIMITED');
});
