import './helpers/env.js'; // must stay first: sets the environment before the app is imported
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const { default: app } = await import('../src/app.js');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
});

test('GET /api/health returns the standard success envelope', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.status, 'ok');
  assert.equal(body.data.database, 'disconnected'); // tests do not open a DB connection
  assert.ok(typeof body.data.uptimeSeconds === 'number');
});

test('unknown routes return a JSON 404 (not an HTML page)', async () => {
  const res = await fetch(`${baseUrl}/api/does-not-exist`);
  const body = await res.json();

  assert.equal(res.status, 404);
  assert.equal(body.success, false);
  assert.match(body.message, /Route not found/);
});

test('malformed JSON bodies return 400 through the central error handler', async () => {
  const res = await fetch(`${baseUrl}/api/health`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ "broken": ',
  });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.success, false);
});

test('security headers are set by helmet and x-powered-by is hidden', async () => {
  const res = await fetch(`${baseUrl}/api/health`);

  assert.equal(res.headers.get('x-powered-by'), null);
  assert.ok(res.headers.get('x-content-type-options'));
});

test('CORS allows the configured client origin and rejects others', async () => {
  const allowed = await fetch(`${baseUrl}/api/health`, {
    headers: { Origin: 'http://localhost:5173' },
  });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.equal(allowed.headers.get('access-control-allow-credentials'), 'true');

  const blocked = await fetch(`${baseUrl}/api/health`, {
    headers: { Origin: 'http://evil.example.com' },
  });
  assert.equal(blocked.status, 403);
});
