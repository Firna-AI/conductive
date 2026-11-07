// @ts-check
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Serves the development page of the workspace screen with React only,
 * without the Worker, so the page runs on the fake API alone. Run it from
 * the repository root:
 * `npx vite --config src/shell/workspace/dev/vite.config.js --port 5182`,
 * then open `/src/shell/workspace/dev/`. It is JavaScript, so Vite's Node
 * types stay out of the app's type check.
 */
export default defineConfig({
  root: new URL('../../../..', import.meta.url).pathname,
  plugins: [react()],
})
