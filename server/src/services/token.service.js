import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ISSUER = 'shopsphere';
const AUDIENCE = 'shopsphere-web';

/** Short-lived JWT. The role inside is informational; the DB is the source of truth. */
export function signAccessToken(user) {
  return jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    subject: String(user._id),
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  });
}

/** Pinning `algorithms` prevents algorithm-confusion attacks (e.g. alg: none). */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/** Random opaque token. Send `token` to the user, store only `hash`. */
export function generateOpaqueToken(bytes = 48) {
  const token = crypto.randomBytes(bytes).toString('base64url');
  return { token, hash: hashToken(token) };
}
