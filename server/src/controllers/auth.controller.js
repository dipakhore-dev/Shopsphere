import * as authService from '../services/auth.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { clearAuthCookies, setAuthCookies } from '../utils/cookies.js';
import { COOKIE_NAMES } from '../utils/constants.js';
import { serializeUser } from '../utils/serializers.js';
import { issueCsrfToken } from '../middleware/csrf.js';

const meta = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });

// Tokens travel ONLY in HttpOnly cookies, never in the JSON body.

export const getCsrfToken = (req, res) => {
  const csrfToken = issueCsrfToken(req, res);
  sendSuccess(res, { message: 'CSRF token issued', data: { csrfToken } });
};

export const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken, verificationEmail } = await authService.register(req.body, meta(req));
  setAuthCookies(res, { accessToken, refreshToken });
  sendSuccess(res, {
    statusCode: 201,
    message: 'Account created. Check your email to verify your address.',
    // 'sent' | 'simulated' (development: nothing was sent) | 'failed' (account exists; the user can resend).
    // The verification token is NEVER part of any response.
    data: { user: serializeUser(user), verificationEmail },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body, meta(req));
  setAuthCookies(res, { accessToken, refreshToken });
  sendSuccess(res, { message: 'Logged in', data: { user: serializeUser(user) } });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies?.[COOKIE_NAMES.refresh]);
  clearAuthCookies(res);
  sendSuccess(res, { message: 'Logged out' });
});

export const refresh = asyncHandler(async (req, res) => {
  try {
    const { user, accessToken, refreshToken } = await authService.refresh(
      req.cookies?.[COOKIE_NAMES.refresh],
      meta(req),
    );
    setAuthCookies(res, { accessToken, refreshToken });
    sendSuccess(res, { message: 'Session refreshed', data: { user: serializeUser(user) } });
  } catch (err) {
    clearAuthCookies(res); // a dead session must not keep retrying with stale cookies
    throw err;
  }
});

export const me = (req, res) => {
  sendSuccess(res, { data: { user: serializeUser(req.user) } });
};

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  sendSuccess(res, {
    message: 'If an account exists for that email, a reset link has been sent.',
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  clearAuthCookies(res);
  sendSuccess(res, { message: 'Password updated. Please log in with your new password.' });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.body.token);
  sendSuccess(res, { message: 'Email verified', data: { isEmailVerified: true } });
});

export const resendVerification = asyncHandler(async (req, res) => {
  if (req.user) {
    const { delivery, cooldownSeconds } = await authService.resendVerification(req.user);
    return sendSuccess(res, { message: 'Verification email sent', data: { delivery, cooldownSeconds } });
  }

  if (!req.body.email) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');

  await authService.resendVerificationByEmail(req.body.email);
  return sendSuccess(res, {
    message: 'If that address belongs to an unverified account, a new verification email has been sent.',
  });
});

export const verificationStatus = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await authService.getVerificationStatus(req.user) });
});
