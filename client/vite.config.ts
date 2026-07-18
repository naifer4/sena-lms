import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El cliente corre en el puerto 5173 y reenvía las llamadas /api y /uploads al backend (4000)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
    },
  },
});
