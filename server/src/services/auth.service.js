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
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
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

async function issueVerificationToken(user) {
  const { token, hash } = generateOpaqueToken();
  user.emailVerificationTokenHash = hash;
  user.emailVerificationExpires = new Date(Date.now() + VERIFY_TTL_MS);
  await user.save();
  return token;
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

  const token = await issueVerificationToken(user);
  await safeSend(sendVerificationEmail, user, token);

  const session = await createSession(user, meta);
  return { user, ...session };
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

export async function verifyEmail(rawToken) {
  const user = await User.findOne({
    emailVerificationTokenHash: hashToken(rawToken),
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) throw ApiError.badRequest('This verification link is invalid or has expired');

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();
  return user;
}

export async function resendVerification(user) {
  if (user.isEmailVerified) throw ApiError.conflict('Your email is already verified');
  const token = await issueVerificationToken(user);
  await safeSend(sendVerificationEmail, user, token);
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
