import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import toast, { Toaster } from 'react-hot-toast';

import App from './App.jsx';
import { store } from './redux/store.js';
import { sessionExpired } from './redux/slices/authSlice.js';
import { setAuthFailureHandler } from './services/api.js';
import './index.css';

// When a silent token refresh fails the session is over: clear the user so
// protected routes redirect to /login. Only tell the user if they WERE signed in.
setAuthFailureHandler(() => {
  const wasSignedIn = Boolean(store.getState().auth.user);
  store.dispatch(sessionExpired());
  if (wasSignedIn) toast.error('Your session expired. Please log in again.');
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
