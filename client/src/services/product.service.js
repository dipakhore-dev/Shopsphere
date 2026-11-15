import api from './api.js';
import { cleanParams } from '../utils/params.js';

/** -> { products, meta } */
export const fetchProducts = (params, signal) =>
  api.get('/products', { params: cleanParams(params), signal }).then((res) => ({
    products: res.data.data.products,
    meta: res.data.meta,
  }));

export const fetchProduct = (id, signal) => api.get(`/products/${id}`, { signal }).then((res) => res.data.data.product);

/** -> { products: [{ id, name, finalPrice, image }], categories: [{ id, name, slug }] } */
export const fetchSuggestions = (q, signal) =>
  api.get('/products/suggestions', { params: { q }, signal }).then((res) => res.data.data);
