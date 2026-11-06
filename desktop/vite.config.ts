import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { DEFAULT_APP_ORIGIN, readConfiguration } from './src/config.ts'

export default defineConfig({
  root: resolve(import.meta.dirname, '..'),
  define: {
    __CONDUCTING_APP_ORIGIN__: JSON.stringify(
      readConfiguration({
        appOrigin: process.env.CONDUCTING_APP_ORIGIN ?? DEFAULT_APP_ORIGIN,
      }).appOrigin,
    ),
  },
  plugins: [
    react(),
    {
      name: 'conducting-desktop-chrome',
      transformIndexHtml: {
        order: 'pre',
        handler: (html) =>
          html
            .replace('src="/src/main.tsx"', 'src="/desktop/renderer/main.tsx"')
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
