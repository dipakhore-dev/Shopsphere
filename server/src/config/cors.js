import { env } from './env.js';

/**
 * Cookie-based auth requires:
 *   - an explicit origin allow-list (never "*" together with credentials)
 *   - credentials: true
 */
export const corsOptions = {
  origin(origin, callback) {
    // Requests without an Origin header (Postman, curl, server-to-server
    // webhooks) are not browser cross-origin requests, so allow them.
    if (!origin) return callback(null, true);

    if (env.clientOrigins.includes(origin.replace(/\/+$/, ''))) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Requested-With', 'Idempotency-Key'],
  maxAge: 600,
};
