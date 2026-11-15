import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

let token = null;
let pending = null;

/**
 * CSRF token (double-submit cookie). Kept in memory only: the browser holds the
 * matching HttpOnly cookie, and the server compares the two on every unsafe request.
 * Uses plain axios (not our `api` instance) to avoid an interceptor loop.
 */
export async function ensureCsrfToken() {
  if (token) return token;

  pending ??= axios
    .get(`${baseURL}/auth/csrf`, { withCredentials: true, timeout: 15_000 })
    .then((res) => {
      token = res.data.data.csrfToken;
      return token;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}

export function resetCsrfToken() {
  token = null;
}
