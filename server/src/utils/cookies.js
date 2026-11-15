import { env } from '../config/env.js';
import { COOKIE_NAMES, REFRESH_COOKIE_PATH } from './constants.js';

const base = Object.freeze({
  httpOnly: true, // JavaScript can never read these cookies (XSS cannot steal tokens)
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
});

export function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie(COOKIE_NAMES.access, accessToken, {
    ...base,
    path: '/',
    maxAge: env.ACCESS_TOKEN_TTL_SECONDS * 1000,
  });
  res.cookie(COOKIE_NAMES.refresh, refreshToken, {
    ...base,
    path: REFRESH_COOKIE_PATH,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res) {
  res.clearCookie(COOKIE_NAMES.access, { ...base, path: '/' });
  res.clearCookie(COOKIE_NAMES.refresh, { ...base, path: REFRESH_COOKIE_PATH });
}

export function setCsrfCookie(res, token) {
  res.cookie(COOKIE_NAMES.csrf, token, {
    ...base,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}
