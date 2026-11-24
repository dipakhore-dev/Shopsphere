import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as authService from '../../services/auth.service.js';
import { getErrorMessage } from '../../utils/errors.js';

/**
 * Runs once when the app loads: asks the server who we are.
 * (The HttpOnly cookie is invisible to JS, so the server is the only source of truth.)
 * A 401 simply means "not logged in" and is not an error.
 */
export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async (_, { rejectWithValue }) => {
  try {
    return await authService.getMe();
  } catch (err) {
    if (err.response?.status === 401) return null;
    return rejectWithValue(getErrorMessage(err));
  }
});

const thunk = (type, fn) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    try {
      return await fn(arg);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  });

export const loginUser = thunk('auth/login', authService.login);
export const registerUser = thunk('auth/register', authService.register);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try {
    await authService.logout();
  } catch {
    // Even if the network call fails we still clear local state below.
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    initialized: false, // false until the first /auth/me answer arrives
  },
  reducers: {
    /** Dispatched by the Axios interceptor when refreshing the session failed. */
    sessionExpired(state) {
      state.user = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.fulfilled, (state, { payload }) => {
        state.user = payload;
        state.initialized = true;
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.initialized = true;
      })
      .addCase(loginUser.fulfilled, (state, { payload }) => {
        state.user = payload;
      })
      .addCase(registerUser.fulfilled, (state, { payload }) => {
        state.user = payload.user;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export const { sessionExpired } = authSlice.actions;
export default authSlice.reducer;
