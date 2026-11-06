import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  root: resolve(import.meta.dirname, '..'),
  plugins: [
    react(),
    {
      name: 'conducting-desktop-chrome',
      transformIndexHtml: {
        order: 'pre',
        handler: (html) =>
          html
            .replace('<body>', '<body><div data-desktop-chrome-slot></div>')
            .replace(
              '</body>',
              '<script type="module" src="/desktop/renderer/chrome.ts"></script></body>',
            ),
      },
    },
  ],
  build: {
    outDir: resolve(import.meta.dirname, 'dist/bundle/web'),
    emptyOutDir: true,
  },
})
