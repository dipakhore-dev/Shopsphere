import api from './api.js';

const unwrap = (res) => res.data.data.cart;

export const getCart = () => api.get('/cart').then(unwrap);
export const addCartItem = (productId, quantity = 1) => api.post('/cart/items', { productId, quantity }).then(unwrap);
export const setCartItemQuantity = (productId, quantity) => api.patch(`/cart/items/${productId}`, { quantity }).then(unwrap);
export const removeCartItem = (productId) => api.delete(`/cart/items/${productId}`).then(unwrap);
