import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // In development the browser talks to Vite (same origin) and Vite
      // forwards /api/* to the Express server. No CORS preflights, and
      // HttpOnly cookies (Phase 2) behave like they will in production.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
