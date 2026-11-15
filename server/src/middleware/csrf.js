import crypto from 'node:crypto';
import { ApiError } from '../utils/ApiError.js';
import { COOKIE_NAMES } from '../utils/constants.js';
import { setCsrfCookie } from '../utils/cookies.js';

/**
 * Double-submit-cookie CSRF protection.
 *
 * 1. GET /api/auth/csrf sets an HttpOnly cookie AND returns the same value in the JSON body.
 * 2. The SPA keeps the value in memory and sends it in the X-CSRF-Token header.
 * 3. For every unsafe method we require header === cookie.
 *
 * A malicious site can make the browser send our cookie, but it cannot read the
 * token (blocked by CORS / same-origin policy), so it cannot set the header.
 * Works for both same-site (Vite proxy) and cross-site deployments.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

// Server-to-server callbacks carry no cookies and are authenticated by signature instead.
const EXEMPT_PATHS = ['/payments/webhook'];

const safeEqual = (a, b) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

/** Returns the caller's CSRF token, creating (and setting the cookie for) a new one if needed. */
export function issueCsrfToken(req, res) {
  const existing = req.cookies?.[COOKIE_NAMES.csrf];
  if (existing && TOKEN_PATTERN.test(existing)) return existing;

  const token = crypto.randomBytes(32).toString('base64url');
  setCsrfCookie(res, token);
  return token;
}

export function csrfProtection(req, _res, next) {
  if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.includes(req.path)) return next();

  const cookieToken = req.cookies?.[COOKIE_NAMES.csrf];
  const headerToken = req.get('x-csrf-token');

  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    return next(ApiError.forbidden('Invalid or missing CSRF token', 'CSRF_INVALID'));
  }
  next();
}
