import api from './api.js';

const unwrap = (res) => res.data.data.address;

export const listAddresses = (signal) => api.get('/addresses', { signal }).then((res) => res.data.data.addresses);
export const createAddress = (payload) => api.post('/addresses', payload).then(unwrap);
export const updateAddress = (id, payload) => api.patch(`/addresses/${id}`, payload).then(unwrap);
export const deleteAddress = (id) => api.delete(`/addresses/${id}`).then((res) => res.data);
