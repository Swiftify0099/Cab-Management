import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward all /api/v1/admin and /api/v1/auth calls to the auth service
      '/api/v1/admin': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/api/v1/auth': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/api/v1/profile': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/api/v1/driver': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
