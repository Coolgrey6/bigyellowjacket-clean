import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(() => {
  const keyPath = path.resolve(__dirname, '../../ssl/key.pem')
  const certPath = path.resolve(__dirname, '../../ssl/cert.pem')

  const haveCerts = fs.existsSync(keyPath) && fs.existsSync(certPath)
  const httpsConfig = haveCerts
    ? {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      }
    : undefined

  if (!haveCerts) {
    // eslint-disable-next-line no-console
    console.warn('[vite] SSL certs not found in ../../ssl; starting dev server over HTTP')
  }

  return {
    plugins: [react()],
    server: {
      https: httpsConfig,
      port: Number(process.env.PORT || 5173),
      host: true,
      hmr: {
        port: 5173,
        host: 'localhost',
      },
      watch: {
        usePolling: true,
        interval: 1000,
      },
      proxy: haveCerts
        ? {
            '/api': {
              target: 'https://localhost:9443',
              changeOrigin: true,
              secure: false,
            },
            '/ws': {
              target: 'wss://localhost:9443',
              ws: true,
              changeOrigin: true,
            },
          }
        : {
            '/api': {
              target: 'http://localhost:8083',
              changeOrigin: true,
            },
            '/ws': {
              target: 'ws://localhost:8766',
              ws: true,
              changeOrigin: true,
            },
          },
    },
  }
})
