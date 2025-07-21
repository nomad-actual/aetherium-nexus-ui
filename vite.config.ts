// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import csp from "vite-plugin-csp-guard";

export default defineConfig({
  plugins: [
    react(),
    csp({
      dev: {
        run: true,  // Run the plugin in dev mode
        // outlierSupport: ['tailwind']
      },   
      policy: {
        "script-src": ["'self'"],
        "script-src-elem": ["'self'", "'unsafe-inline'"],
        // "font-src": ["'self'"],
        // "style-src": ["'self'", "'http://localhost:5173'"],
        "style-src-elem": ["'self'", "'unsafe-inline'"],
        "style-src-attr": ["'self'", "'unsafe-inline'"],
        "connect-src": [
          "http://localhost:3000",
          "http://ollama.homelab.ist:11434",
          "ws://localhost:5173",
        ],
        // "default-src": ["'self'"],
      },
      build:{
        sri: true,
      }
    }),
  ],
  html: {
    // cspNonce: `nonce-${Date.now()}`,
  },
  server: {
    host: '0.0.0.0',
    cors: true,
    headers: {
      // 'Content-Security-Policy': `style-src 'nonce-random' 'self'`,
    },
     
  }
})
