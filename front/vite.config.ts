import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl(), //add
  ],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  
  server: {
    host: true, 
    https: true, //add
    proxy: {
      '/api': {
        target: 'http://localhost:5000', 
        changeOrigin: true, 
        secure: false 
      }
    }
  }
})