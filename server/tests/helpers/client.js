import request from 'supertest';

/**
 * A supertest agent (keeps cookies like a browser) that already fetched a CSRF
 * token and attaches it to every unsafe request.
 */
export async function createClient(app) {
  const agent = request.agent(app);
  const res = await agent.get('/api/auth/csrf');
  const csrf = res.body.data.csrfToken;

  const unsafe = (method) => (url, body) => {
    const req = agent[method](url).set('X-CSRF-Token', csrf);
    return body === undefined ? req : req.send(body);
  };

  return {
    agent,
    csrf,
    get: (url) => agent.get(url),
    post: unsafe('post'),
    patch: unsafe('patch'),
    delete: unsafe('delete'),
  };
}

/** Value of a cookie set by a response, or null. */
export function getSetCookie(res, name) {
  const header = (res.headers['set-cookie'] || []).find((c) => c.startsWith(`${name}=`));
  return header ? header.split(';')[0].slice(name.length + 1) : null;
}

/** Sends a refresh request carrying an explicit (possibly old) refresh token. */
export function refreshWith(app, csrf, refreshToken) {
  return request(app)
    .post('/api/auth/refresh')
    .set('Cookie', [`refreshToken=${refreshToken}`, `csrfToken=${csrf}`])
    .set('X-CSRF-Token', csrf);
}

export const validUser = (overrides = {}) => ({
  name: 'Asha Verma',
  email: 'asha@example.com',
  password: 'Passw0rd!x',
  ...overrides,
});
