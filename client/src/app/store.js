import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice.js';
import productsReducer from '../features/products/productsSlice.js';
import filesReducer from '../features/files/filesSlice.js';
import { authApi } from '../features/auth/authApi.js';
import { productsApi } from '../features/products/productsApi.js';
import { filesApi } from '../features/files/filesApi.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productsReducer,
    files: filesReducer,
    [authApi.reducerPath]: authApi.reducer,
    [productsApi.reducerPath]: productsApi.reducer,
    [filesApi.reducerPath]: filesApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      productsApi.middleware,
      filesApi.middleware
    ),
});
