// @ts-check
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Serves the chat development page with React only, without the Worker, so
 * the page runs on the fake API alone. Run it from the repository root:
 * `npx vite --config src/chat/dev/vite.config.js --port 5181`, then open
 * `/src/chat/dev/`. It is JavaScript, so Vite's Node types stay out of the
 * app's type check.
 */
export default defineConfig({
  root: new URL('../../..', import.meta.url).pathname,
  plugins: [react()],
})
