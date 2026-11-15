import api from './api.js';
import { cleanParams } from '../utils/params.js';

const unwrap = (res) => res.data.data.product;

export const listMyProducts = (params, signal) =>
  api.get('/sellers/products', { params: cleanParams(params), signal }).then((res) => ({
    products: res.data.data.products,
    meta: res.data.meta,
  }));

export const getMyProduct = (id, signal) => api.get(`/sellers/products/${id}`, { signal }).then(unwrap);
export const createProduct = (payload) => api.post('/products', payload).then(unwrap);
export const updateProduct = (id, payload) => api.patch(`/products/${id}`, payload).then(unwrap);
export const deleteProduct = (id) => api.delete(`/products/${id}`).then((res) => res.data);

/** Uploads up to 6 files -> [{ url, publicId }] */
export function uploadProductImages(files) {
  const form = new FormData();
  files.forEach((file) => form.append('images', file));
  // Content-Type must be overridden: our Axios default (application/json) would corrupt FormData.
  // The browser then adds the multipart boundary itself.
  return api
    .post('/sellers/products/images', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60_000 })
    .then((res) => res.data.data.images);
}
