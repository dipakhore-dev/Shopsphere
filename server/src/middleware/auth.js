import { User } from '../models/User.js';
import { verifyAccessToken } from '../services/token.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { COOKIE_NAMES, USER_STATUS } from '../utils/constants.js';

/**
 * Authentication: who is calling?
 * Reads the access token from the HttpOnly cookie, verifies it, then loads the
 * user from the database so that role changes, suspensions and password
 * changes take effect immediately instead of waiting for the token to expire.
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[COOKIE_NAMES.access];
  if (!token) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    throw ApiError.unauthorized(
      expired ? 'Session expired' : 'Invalid authentication token',
      expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
    );
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('Account not found', 'TOKEN_INVALID');

  if (user.status !== USER_STATUS.ACTIVE) {
    throw ApiError.forbidden('Your account has been suspended. Please contact support.', 'ACCOUNT_SUSPENDED');
  }

  // Tokens issued before the last password change are no longer valid.
  if (user.passwordChangedAt && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    throw ApiError.unauthorized('Password was changed. Please log in again.', 'TOKEN_REVOKED');
  }

  req.user = user;
  next();
});

/**
 * For endpoints that work both logged in and logged out. No cookie -> anonymous (req.user stays
 * undefined). A cookie that is present must be valid, otherwise the usual 401 is returned so the
 * browser can silently refresh its session.
 */
export const optionalAuthenticate = (req, res, next) => {
  if (!req.cookies?.[COOKIE_NAMES.access]) return next();
  return authenticate(req, res, next);
};

/**
 * Authorization: what may they do?  Usage: router.get('/x', authenticate, authorize('admin'), handler)
 */
export const authorize =
  (...allowedRoles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED'));
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to access this resource', 'FORBIDDEN_ROLE'));
    }
    next();
  };

/** Gate for sensitive actions (checkout, applying as a seller) behind a verified email. */
export const requireVerifiedEmail = (req, _res, next) => {
  if (!req.user?.isEmailVerified) {
    return next(ApiError.forbidden('Please verify your email address first', 'EMAIL_NOT_VERIFIED'));
  }
  next();
};
