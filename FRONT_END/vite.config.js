import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-leaflet': ['leaflet', 'react-leaflet'],
          'vendor-charts': ['chart.js', 'react-chartjs-2', 'recharts'],
          'vendor-utils': ['proj4']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})

