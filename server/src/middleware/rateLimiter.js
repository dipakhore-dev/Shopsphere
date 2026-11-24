import rateLimit from 'express-rate-limit';

// Read at request time so tests can switch limiting on for one file only.
const skip = () => process.env.DISABLE_RATE_LIMIT === 'true';

const make = ({ windowMs, limit, message, keyGenerator, skip: extraSkip }) =>
  rateLimit({
    windowMs,
    limit,
    skip: (req) => skip() || Boolean(extraSkip?.(req)),
    ...(keyGenerator ? { keyGenerator } : {}),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message, code: 'RATE_LIMITED' },
  });

/** Broad safety net for the whole API. */
export const apiLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: 'Too many requests. Please try again in a few minutes.',
});

/** Login, register, verify-email, reset-password. */
export const authLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: 'Too many attempts. Please try again in 15 minutes.',
});

/** Endpoints that send an email (forgot-password, resend-verification): protects inboxes and SMTP quota. */
export const emailLimiter = make({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: 'Too many email requests. Please try again in an hour.',
});

/** Silent token refresh happens often, so it gets a more generous bucket. */
export const refreshLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  message: 'Too many refresh attempts. Please log in again.',
});

/** Image uploads cost money (storage + bandwidth), so they are limited per IP. */
export const uploadLimiter = make({
  windowMs: 60 * 60 * 1000,
  limit: 40,
  message: 'Too many uploads. Please try again later.',
});

/** Placing orders: generous for real shoppers, tight enough to stop scripts. */
export const orderLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: 'Too many order attempts. Please wait a few minutes.',
});

/**
 * Verification emails, per IP and per ACCOUNT. The per-account limit is keyed by user id, so
 * switching networks does not reset it. (The resend cooldown in auth.service.js is the third layer.)
 */
export const resendIpLimiter = make({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: 'Too many verification email requests. Please try again later.',
});
export const resendUserLimiter = make({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: 'You have requested too many verification emails. Please try again in an hour.',
  skip: (req) => !req.user, // anonymous requests are limited by IP above
  keyGenerator: (req) => `user:${req.user.id}`,
});
