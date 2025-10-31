import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl' // 1. Importa el plugin

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl() // 2. Añádelo a la lista de plugins
  ],
  server: {
    host: true, // 3. Asegúrate que 'host' siga aquí
    proxy: {
      // Redirige cualquier petición que empiece con '/api'
      '/api': {
        target: 'http://localhost:5000', // Apunta a tu backend HTTP
        changeOrigin: true, // Necesario para que el backend acepte la petición
        secure: false       // No te preocupes por certs SSL en el backend
      }
    }
  }
})