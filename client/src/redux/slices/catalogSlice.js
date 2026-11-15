import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchCategories } from '../../services/category.service.js';

/** Categories rarely change and are needed everywhere (nav bar, filters, seller form), so they live in the store. */
export const loadCategories = createAsyncThunk('catalog/loadCategories', async () => fetchCategories());

const catalogSlice = createSlice({
  name: 'catalog',
  initialState: { categories: [], status: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadCategories.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadCategories.fulfilled, (state, { payload }) => {
        state.categories = payload;
        state.status = 'ready';
      })
      .addCase(loadCategories.rejected, (state) => {
        state.status = 'error';
      });
  },
});

export default catalogSlice.reducer;
