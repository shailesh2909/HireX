import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api/companies': {
        target: 'http://127.0.0.1:3002',
        changeOrigin: true,
        secure: false,
      },
      '/api/events': {
        target: 'http://127.0.0.1:3006',
        changeOrigin: true,
        secure: false,
      },

      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
