import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

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
    port: 3000,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // State management + data fetching
          'vendor-state': ['zustand', '@tanstack/react-query'],
          // ECharts (lazy-loaded via dynamic import, but still split out)
          'vendor-echarts': ['echarts'],
          // Form handling
          'vendor-form': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
    // echarts is ~1MB but lazy-loaded; suppress the warning
    chunkSizeWarningLimit: 1200,
  },
})
