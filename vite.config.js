// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite';
import csp from "vite-plugin-csp-guard";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    csp({
      dev: {
        run: true,  // Run the plugin in dev mode
      },   
      policy: {
        "script-src": ["'self'"],
        "font-src": ["'self'"],
        "style-src": ["'self'"],
        "style-src-elem": ["'self'"],
        "connect-src": ["'self'", "'https://ollama.homelab.ist'", "'locahost'"],
      },
      build:{
        sri: true
      }
    })
  ],
  html: {
    cspNonce: 'sdfjskdfjksjdf',
  },
  server: {
    host: '0.0.0.0',
    cors: true,
    headers: {
      // 'Content-Security-Policy': `style-src 'nonce-random' 'self'`,
    },
     
  }
})
