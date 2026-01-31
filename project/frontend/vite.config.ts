import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/auth': { target: 'http://localhost:8000', changeOrigin: true, secure: false },
      '/accounts': { target: 'http://localhost:8000', changeOrigin: true, secure: false },
      '/jobs': { target: 'http://localhost:8000', changeOrigin: true, secure: false },
      '/attendance': { target: 'http://localhost:8000', changeOrigin: true, secure: false },
      '/performance': { target: 'http://localhost:8000', changeOrigin: true, secure: false },
      '/time-adjustments': { target: 'http://localhost:8000', changeOrigin: true, secure: false },
      '/health': { target: 'http://localhost:8000', changeOrigin: true, secure: false },
      '/system': { target: 'http://localhost:8000', changeOrigin: true, secure: false },
      '/uploads': { target: 'http://localhost:8000', changeOrigin: true, secure: false },
    }
  }
})
