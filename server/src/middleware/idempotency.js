import { ApiError } from '../utils/ApiError.js';

const KEY_PATTERN = /^[A-Za-z0-9_-]{16,64}$/; // a UUID (36 chars with dashes) fits

/**
 * Requires "Idempotency-Key: <uuid>" on requests that must never run twice (placing an order).
 * The client creates ONE key per checkout attempt and re-sends the same key when retrying.
 */
export function requireIdempotencyKey(req, _res, next) {
  const key = req.get('idempotency-key');
  if (!key || !KEY_PATTERN.test(key)) {
    return next(ApiError.badRequest('A valid Idempotency-Key header is required', 'IDEMPOTENCY_KEY_REQUIRED'));
  }
  req.idempotencyKey = key;
  return next();
}
