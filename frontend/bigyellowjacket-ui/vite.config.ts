import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '../../ssl/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '../../ssl/cert.pem')),
    },
    port: 8443,
    host: true,
    proxy: {
      '/api': {
        target: 'https://localhost:9443',
        changeOrigin: true,
        secure: false
      },
      '/ws': {
        target: 'wss://localhost:9443',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
