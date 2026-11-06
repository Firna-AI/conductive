import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Development only: serves the Files development page with Vite alone,
 * without the Worker and its routing. Run it from the repository root,
 * then open http://127.0.0.1:5173/src/files/dev.html:
 *
 *   npm exec vite -- --config src/files/dev/vite.config.ts
 */
export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173 },
})
