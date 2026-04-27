import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — loaded first, cached long-term
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // Mantine UI — large but stable, split from app code
          'vendor-mantine': [
            '@mantine/core',
            '@mantine/hooks',
            '@mantine/form',
            '@mantine/modals',
            '@mantine/notifications',
          ],

          // Charts — recharts pulls in a lot of d3 sub-packages
          'vendor-charts': ['recharts'],

          // Map — react-simple-maps bundles topojson internally
          'vendor-maps': ['react-simple-maps'],

          // Data / state
          'vendor-query': [
            '@tanstack/react-query',
            '@tanstack/react-query-devtools',
          ],

          // Small utilities — keep separate so they don't bloat main
          'vendor-misc': [
            'lucide-react',
            'zustand',
            'zod',
            'react-hook-form',
            'diff-match-patch',
          ],
        },
      },
    },
  },
})
