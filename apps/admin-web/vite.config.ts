import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_BACKEND_URL || 'https://cab-management-1.onrender.com'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api/v1': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})

