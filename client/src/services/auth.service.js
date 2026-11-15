import api from './api.js';

const unwrapUser = (res) => res.data.data.user;

export const register = (payload) => api.post('/auth/register', payload).then(unwrapUser);
export const login = (payload) => api.post('/auth/login', payload).then(unwrapUser);
export const logout = () => api.post('/auth/logout').then((res) => res.data);
export const getMe = () => api.get('/auth/me').then(unwrapUser);

export const forgotPassword = (email) => api.post('/auth/forgot-password', { email }).then((res) => res.data);
export const resetPassword = (token, password) =>
  api.post('/auth/reset-password', { token, password }).then((res) => res.data);
export const verifyEmail = (token) => api.post('/auth/verify-email', { token }).then((res) => res.data);
export const resendVerification = () => api.post('/auth/resend-verification').then((res) => res.data);
