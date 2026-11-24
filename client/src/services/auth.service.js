import api from './api.js';

const unwrapUser = (res) => res.data.data.user;

/** -> { user, verificationEmail: 'sent' | 'simulated' | 'failed' } */
export const register = (payload) => api.post('/auth/register', payload).then((res) => res.data.data);
export const login = (payload) => api.post('/auth/login', payload).then(unwrapUser);
export const logout = () => api.post('/auth/logout').then((res) => res.data);
export const getMe = () => api.get('/auth/me').then(unwrapUser);

export const forgotPassword = (email) => api.post('/auth/forgot-password', { email }).then((res) => res.data);
export const resetPassword = (token, password) =>
  api.post('/auth/reset-password', { token, password }).then((res) => res.data);
export const verifyEmail = (token) => api.post('/auth/verify-email', { token }).then((res) => res.data);
/**
 * Logged in: call with no argument. Logged out: pass the email address.
 * Logged in -> { data: { delivery: 'sent' | 'simulated', cooldownSeconds } }
 */
export const resendVerification = (email) => api.post('/auth/resend-verification', email ? { email } : {}).then((res) => res.data);
/** -> { email, isEmailVerified, cooldownSeconds } */
export const getVerificationStatus = () => api.get('/auth/verification-status').then((res) => res.data.data);
