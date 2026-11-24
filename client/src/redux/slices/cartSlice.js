import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as cartService from '../../services/cart.service.js';
import { getErrorMessage } from '../../utils/errors.js';

const thunk = (type, fn) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    try {
      return await fn(arg);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  });

export const loadCart = thunk('cart/load', () => cartService.getCart());
export const addToCart = thunk('cart/add', ({ productId, quantity }) => cartService.addCartItem(productId, quantity));
export const updateCartItem = thunk('cart/update', ({ productId, quantity }) => cartService.setCartItemQuantity(productId, quantity));
export const removeCartItem = thunk('cart/remove', (productId) => cartService.removeCartItem(productId));

/** The server is the only place that calculates prices: the store just holds what it last returned. */
const cartSlice = createSlice({
  name: 'cart',
  initialState: { cart: null, status: 'idle' },
  reducers: {
    resetCart(state) {
      state.cart = null;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadCart.pending, (state) => {
      state.status = 'loading';
    });
    builder.addCase(loadCart.rejected, (state) => {
      state.status = 'error';
    });
    [loadCart, addToCart, updateCartItem, removeCartItem].forEach((t) =>
      builder.addCase(t.fulfilled, (state, { payload }) => {
        state.cart = payload;
        state.status = 'ready';
      }),
    );
  },
});

export const { resetCart } = cartSlice.actions;
export const selectCartCount = (state) => state.cart.cart?.summary.itemCount ?? 0;
export default cartSlice.reducer;
