import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Split large vendor chunks for better caching
    rollupOptions: {
      output: {
        // Vite 8 (rolldown) requires manualChunks to be a function
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';
            if (id.includes('@fullcalendar')) return 'vendor-calendar';
            if (id.includes('socket.io') || id.includes('engine.io')) return 'vendor-socket';
            if (id.includes('react-quill') || id.includes('quill')) return 'vendor-editor';
            if (id.includes('@hello-pangea') || id.includes('dnd')) return 'vendor-dnd';
            if (id.includes('lucide') || id.includes('emoji-picker')) return 'vendor-ui';
          }
        },
      },
    },
    // Increase chunk warning limit for large pages
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    // Pre-bundle heavy deps so dev server starts faster
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'socket.io-client',
      'lucide-react',
      'date-fns',
    ],
  },
})
