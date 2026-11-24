import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as wishlistService from '../../services/wishlist.service.js';
import { getErrorMessage } from '../../utils/errors.js';

const thunk = (type, fn) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    try {
      return await fn(arg);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  });

export const loadWishlistIds = thunk('wishlist/load', () => wishlistService.getWishlistIds());
export const saveToWishlist = thunk('wishlist/add', (productId) => wishlistService.addToWishlist(productId));
export const removeFromWishlist = thunk('wishlist/remove', (productId) => wishlistService.removeFromWishlist(productId));

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: { ids: [] },
  reducers: {
    resetWishlist(state) {
      state.ids = [];
    },
  },
  extraReducers: (builder) => {
    [loadWishlistIds, saveToWishlist, removeFromWishlist].forEach((t) =>
      builder.addCase(t.fulfilled, (state, { payload }) => {
        state.ids = payload;
      }),
    );
  },
});

export const { resetWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
