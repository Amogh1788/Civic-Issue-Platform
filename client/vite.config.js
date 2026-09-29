import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, requests to /api and /uploads are forwarded to the Express server,
// so the React app can use relative URLs and you don't hit CORS problems.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
});
