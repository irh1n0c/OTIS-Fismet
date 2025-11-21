import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path' // <-- 1. ¡PRIMER CAMBIO! Importa path

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl()
  ],
  
  // --- 2. ¡SEGUNDO CAMBIO! AÑADE EL BLOQUE RESOLVE ---
  resolve: {
    alias: {
      // Define que '@/...' es igual a 'ruta-absoluta-a-la-carpeta-src'
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // --- FIN DE BLOQUE RESOLVE ---
  
  server: {
    host: true, 
    proxy: {
      // Redirige cualquier petición que empiece con '/api'
      '/api': {
        target: 'http://localhost:5000', // Apunta a tu backend HTTP
        changeOrigin: true, 
        secure: false 
      }
    }
  }
})