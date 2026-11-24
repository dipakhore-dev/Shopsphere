import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice.js';
import authReducer from './slices/authSlice.js';
import catalogReducer from './slices/catalogSlice.js';
import cartReducer from './slices/cartSlice.js';
import wishlistReducer from './slices/wishlistSlice.js';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    auth: authReducer,
    catalog: catalogReducer,
    cart: cartReducer,
    wishlist: wishlistReducer,
  },
});
