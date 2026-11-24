import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { RefreshSession } from '../models/RefreshSession.js';
import { ApiError } from '../utils/ApiError.js';
import { USER_STATUS } from '../utils/constants.js';
import { logger } from '../utils/logger.js';
import { generateOpaqueToken, hashToken, signAccessToken } from './token.service.js';
import { sendPasswordResetEmail, sendVerificationEmail } from './email.service.js';

const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

/**
 * Two browser tabs can legitimately refresh at the same moment. A token that
 * was rotated less than this long ago is rejected WITHOUT revoking the family.
 * Older replays are treated as token theft and revoke the whole family.
 */
export const REFRESH_REUSE_GRACE_MS = 10_000;

const INVALID_CREDENTIALS = 'Invalid email or password';

// Used to spend the same time on "unknown email" as on "wrong password"
// so response timing does not reveal which emails are registered.
const dummyHash = bcrypt.hash('shopsphere-timing-equaliser', env.BCRYPT_ROUNDS);

// ---------- helpers ----------

async function createSession(user, meta, family = crypto.randomUUID()) {
  const { token: refreshToken, hash } = generateOpaqueToken();

  const session = await RefreshSession.create({
    user: user._id,
    tokenHash: hash,
    family,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    userAgent: meta?.userAgent?.slice(0, 512),
    ip: meta?.ip,
  });

  return { accessToken: signAccessToken(user), refreshToken, session };
}

function revokeFamily(family, reason) {
  return RefreshSession.updateMany(
    { family, revokedAt: { $exists: false } },
    { revokedAt: new Date(), revokedReason: reason },
  );
}

function revokeAllForUser(userId, reason) {
  return RefreshSession.updateMany(
    { user: userId, revokedAt: { $exists: false } },
    { revokedAt: new Date(), revokedReason: reason },
  );
}

/** Seconds until another email may be requested (0 = allowed now). The time of the last send is
 *  derived from the token's expiry (expires - TTL), so no extra database field is needed. */
function cooldownRemainingSeconds(expires) {
  if (!expires) return 0;
  // A token that outlives the current TTL was issued under the old 24-hour rule: never make anyone wait on it.
  if (expires.getTime() > Date.now() + env.email.verificationTtlMs) return 0;
  const waitMs = expires.getTime() - env.email.verificationTtlMs + env.email.resendCooldownMs - Date.now();
  return waitMs > 0 ? Math.ceil(waitMs / 1000) : 0;
}

/**
 * Creates a fresh verification token and emails it. ONE atomic update both enforces the rules and stores
 * the new token (replacing, and so invalidating, any older one):
 *   - the user must still be unverified
 *   - no email may have been sent within the cooldown window
 * Two simultaneous requests therefore cannot both send an email.
 *
 * Resolves to { outcome: 'sent' | 'simulated' | 'failed' | 'cooldown' | 'verified', retryAfterSeconds? }
 */
async function issueVerificationEmail(userId) {
  const { token, hash } = generateOpaqueToken();
  const now = Date.now();
  const sentBefore = new Date(now + env.email.verificationTtlMs - env.email.resendCooldownMs);

  const user = await User.findOneAndUpdate(
    {
      _id: userId,
      isEmailVerified: false,
      $or: [
        { emailVerificationExpires: { $exists: false } },
        { emailVerificationExpires: null },
        { emailVerificationExpires: { $lte: sentBefore } }, // last email is older than the cooldown
        { emailVerificationExpires: { $gt: new Date(now + env.email.verificationTtlMs) } }, // legacy long-lived token
      ],
    },
    { $set: { emailVerificationTokenHash: hash, emailVerificationExpires: new Date(now + env.email.verificationTtlMs) } },
    { new: true },
  );

  if (!user) {
    // Not claimed: either already verified, or an email went out too recently.
    const current = await User.findById(userId).select('+emailVerificationExpires isEmailVerified').lean();
    if (!current || current.isEmailVerified) return { outcome: 'verified' };
    return { outcome: 'cooldown', retryAfterSeconds: Math.max(1, cooldownRemainingSeconds(current.emailVerificationExpires)) };
  }

  try {
    const { status } = await sendVerificationEmail(user, token);
    return { outcome: status }; // 'sent' | 'simulated'
  } catch (err) {
    logger.error('Verification email could not be delivered; token discarded so the user can retry immediately');
    // Keep state consistent: do not leave a token (and a cooldown) behind for an email that never left.
    await User.updateOne(
      { _id: userId, emailVerificationTokenHash: hash },
      { $unset: { emailVerificationTokenHash: 1, emailVerificationExpires: 1 } },
    );
    return { outcome: 'failed' };
  }
}

/** Email problems must never break registration or leak whether an account exists. */
async function safeSend(sender, user, token) {
  try {
    await sender(user, token);
  } catch (err) {
    logger.error('Email delivery failed:', err.message);
  }
}

// ---------- public API ----------

export async function register({ name, email, password }, meta) {
  if (await User.exists({ email })) {
    throw ApiError.conflict('An account with this email already exists');
  }

  // role and status are NOT taken from input: they always default to customer/active.
  const user = await User.create({ name, email, password });

  // A failed email never fails registration: the account exists and the user can request another email.
  const verification = await issueVerificationEmail(user._id);

  const session = await createSession(user, meta);
  return { user, ...session, verificationEmail: verification.outcome };
}

export async function login({ email, password }, meta) {
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    await bcrypt.compare(password, await dummyHash);
    throw ApiError.unauthorized(INVALID_CREDENTIALS);
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    throw ApiError.tooMany('Too many failed attempts. Please try again in a few minutes.', 'ACCOUNT_LOCKED');
  }

  const passwordOk = await user.comparePassword(password);

  if (!passwordOk) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_FAILED_LOGINS) {
      user.lockUntil = new Date(Date.now() + LOCK_MS);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    throw ApiError.unauthorized(INVALID_CREDENTIALS);
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    throw ApiError.forbidden('Your account has been suspended. Please contact support.', 'ACCOUNT_SUSPENDED');
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();

  const session = await createSession(user, meta);
  return { user, ...session };
}

/**
 * Refresh-token rotation:
 *   valid token   -> mark it "rotated", issue a brand-new token in the same family
 *   rotated token -> inside grace window: reject; outside: revoke the whole family
 */
export async function refresh(rawToken, meta) {
  if (!rawToken) throw ApiError.unauthorized('No active session', 'NO_REFRESH_TOKEN');

  const session = await RefreshSession.findOne({ tokenHash: hashToken(rawToken) });
  if (!session) throw ApiError.unauthorized('Invalid session', 'INVALID_REFRESH_TOKEN');

  if (session.revokedAt) {
    const recentlyRotated =
      session.revokedReason === 'rotated' && Date.now() - session.revokedAt.getTime() < REFRESH_REUSE_GRACE_MS;

    if (!recentlyRotated) {
      await revokeFamily(session.family, 'reuse_detected');
      logger.warn(`Refresh token reuse detected for user ${session.user}; session family revoked`);
    }
    throw ApiError.unauthorized('Session is no longer valid. Please log in again.', 'REFRESH_TOKEN_REUSED');
  }

  if (session.expiresAt <= new Date()) {
    throw ApiError.unauthorized('Session expired. Please log in again.', 'REFRESH_TOKEN_EXPIRED');
  }

  const user = await User.findById(session.user);
  if (!user || user.status !== USER_STATUS.ACTIVE) {
    await revokeFamily(session.family, 'account_disabled');
    throw ApiError.unauthorized('Session is no longer valid. Please log in again.', 'ACCOUNT_DISABLED');
  }

  // Atomic compare-and-set: if two requests race with the same token only one wins.
  const claimed = await RefreshSession.findOneAndUpdate(
    { _id: session._id, revokedAt: { $exists: false } },
    { revokedAt: new Date(), revokedReason: 'rotated' },
  );
  if (!claimed) {
    throw ApiError.unauthorized('Session already refreshed', 'REFRESH_TOKEN_REUSED');
  }

  const next = await createSession(user, meta, session.family);
  await RefreshSession.updateOne({ _id: session._id }, { replacedBy: next.session._id });

  return { user, accessToken: next.accessToken, refreshToken: next.refreshToken };
}

/** Logging out revokes the entire token family of this device. */
export async function logout(rawToken) {
  if (!rawToken) return;
  const session = await RefreshSession.findOne({ tokenHash: hashToken(rawToken) });
  if (session) await revokeFamily(session.family, 'logout');
}

/**
 * Single-use verification. The token is consumed by ONE atomic update, so two simultaneous requests with
 * the same link cannot both succeed. Only the SHA-256 hash is ever looked up.
 */
export async function verifyEmail(rawToken) {
  const hash = hashToken(rawToken);

  const user = await User.findOneAndUpdate(
    { emailVerificationTokenHash: hash, emailVerificationExpires: { $gt: new Date() } },
    { $set: { isEmailVerified: true }, $unset: { emailVerificationTokenHash: 1, emailVerificationExpires: 1 } },
    { new: true },
  );
  if (user) return user;

  // Not consumed. Tell the user whether the link EXPIRED (they can request a new one) or is simply unknown/used.
  const stale = await User.exists({ emailVerificationTokenHash: hash });
  if (stale) {
    throw new ApiError(400, 'This verification link has expired. Please request a new one.', undefined, 'VERIFICATION_TOKEN_EXPIRED');
  }
  throw new ApiError(400, 'This verification link is invalid or has already been used.', undefined, 'VERIFICATION_TOKEN_INVALID');
}

/** Logged-in users: explicit errors are fine because they already know their own account. */
export async function resendVerification(user) {
  const result = await issueVerificationEmail(user._id);

  switch (result.outcome) {
    case 'verified':
      throw new ApiError(409, 'Your email is already verified', undefined, 'ALREADY_VERIFIED');
    case 'cooldown':
      throw ApiError.tooMany(
        `Please wait ${result.retryAfterSeconds} seconds before requesting another email.`,
        'RESEND_COOLDOWN',
        { retryAfterSeconds: result.retryAfterSeconds },
      );
    case 'failed':
      throw new ApiError(503, 'We could not send the email right now. Please try again in a moment.', undefined, 'EMAIL_DELIVERY_FAILED');
    default:
      return { delivery: result.outcome, cooldownSeconds: env.email.resendCooldownSeconds };
  }
}

/**
 * Logged-out users (for example the link expired and they signed out). The caller always receives the SAME
 * answer, so this endpoint cannot be used to discover which emails are registered or verified.
 */
export async function resendVerificationByEmail(email) {
  const user = await User.findOne({ email }).select('_id status isEmailVerified').lean();
  if (user && user.status === USER_STATUS.ACTIVE && !user.isEmailVerified) {
    await issueVerificationEmail(user._id); // cooldown / delivery problems are deliberately not revealed
  }
}

/** Powers the "verification required" page: the address and how long until another email may be sent. */
export async function getVerificationStatus(user) {
  const current = await User.findById(user._id).select('+emailVerificationExpires email isEmailVerified').lean();
  return {
    email: current.email,
    isEmailVerified: current.isEmailVerified,
    cooldownSeconds: current.isEmailVerified ? 0 : cooldownRemainingSeconds(current.emailVerificationExpires),
  };
}

/** Always resolves the same way, whether or not the email is registered. */
export async function forgotPassword(email) {
  const user = await User.findOne({ email });
  if (!user || user.status !== USER_STATUS.ACTIVE) return;

  const { token, hash } = generateOpaqueToken();
  user.passwordResetTokenHash = hash;
  user.passwordResetExpires = new Date(Date.now() + RESET_TTL_MS);
  await user.save();

  await safeSend(sendPasswordResetEmail, user, token);
}

export async function resetPassword(rawToken, newPassword) {
  const user = await User.findOne({
    passwordResetTokenHash: hashToken(rawToken),
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired');

  user.password = newPassword; // hashed by the pre-save hook, which also sets passwordChangedAt
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  user.isEmailVerified = true; // they proved they control the mailbox
  await user.save();

  // Every existing session (on every device) is signed out.
  await revokeAllForUser(user._id, 'password_reset');
}
