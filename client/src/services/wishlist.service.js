import api from './api.js';

export const getWishlistIds = () => api.get('/wishlist/ids').then((res) => res.data.data.ids);
export const getWishlist = (signal) => api.get('/wishlist', { signal }).then((res) => res.data.data.products);
export const addToWishlist = (productId) => api.post(`/wishlist/${productId}`).then((res) => res.data.data.ids);
export const removeFromWishlist = (productId) => api.delete(`/wishlist/${productId}`).then((res) => res.data.data.ids);
