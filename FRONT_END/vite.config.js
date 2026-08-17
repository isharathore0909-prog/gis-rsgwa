import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/geoserver': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-leaflet': ['leaflet', 'react-leaflet'],
          'vendor-charts': ['highcharts', 'highcharts-react-official'],
          'vendor-utils': ['proj4']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})

