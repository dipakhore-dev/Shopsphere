import axios from 'axios';
import { ensureCsrfToken, resetCsrfToken } from './csrf.js';

/**
 * One configured Axios instance for the whole app.
 * - baseURL: "/api" in dev (Vite proxy) or the full Render URL in production
 * - withCredentials: sends the HttpOnly auth cookies
 * No token is ever read or stored by JavaScript.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

// Endpoints where a 401 means "wrong credentials / no session", not "access token expired".
const NO_REFRESH_PREFIXES = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/csrf',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
];

let onAuthFailure = null;
/** The app registers a callback that clears the user from Redux when the session is dead. */
export function setAuthFailureHandler(handler) {
  onAuthFailure = handler;
}

// 1) Attach the CSRF header to every unsafe request.
api.interceptors.request.use(async (config) => {
  if (UNSAFE_METHODS.has((config.method || 'get').toLowerCase())) {
    config.headers['X-CSRF-Token'] = await ensureCsrfToken();
  }
  return config;
});

// 2) Handle expired access tokens and stale CSRF tokens.
let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (!response || !config) throw error;

    // Stale CSRF token (e.g. cookie was cleared): fetch a new one and retry once.
    if (response.status === 403 && response.data?.code === 'CSRF_INVALID' && !config._csrfRetried) {
      config._csrfRetried = true;
      resetCsrfToken();
      return api(config);
    }

    const skipRefresh = NO_REFRESH_PREFIXES.some((p) => config.url?.startsWith(p));

    if (response.status === 401 && !config._authRetried && !skipRefresh) {
      config._authRetried = true;
      try {
        // Single-flight: if five requests fail at once they all wait for ONE refresh call,
        // because refresh tokens are single-use (rotation).
        refreshPromise ??= api.post('/auth/refresh').finally(() => {
          refreshPromise = null;
        });
        await refreshPromise;
        return api(config);
      } catch {
        onAuthFailure?.();
        throw error;
      }
    }

    throw error;
  },
);

export default api;
