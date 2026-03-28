import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
<<<<<<< HEAD
    port: 3000,
    strictPort: true,
=======
    proxy: {
      // Forward all /api/* calls to the FastAPI backend
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
>>>>>>> 1977c09f4e93d71c2626cee0c04a40a0782789fe
  },
})
