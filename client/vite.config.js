import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Split large vendor chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', 'emoji-picker-react'],
          'vendor-calendar': ['@fullcalendar/core', '@fullcalendar/daygrid', '@fullcalendar/interaction', '@fullcalendar/react'],
          'vendor-dnd': ['@hello-pangea/dnd'],
          'vendor-socket': ['socket.io-client'],
          'vendor-editor': ['react-quill'],
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
