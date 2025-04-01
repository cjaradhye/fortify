import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',  // Use module workers
    plugins: []
  },
  optimizeDeps: {
    exclude: ['solc'] // Prevent vite from trying to bundle solc
  }
})
