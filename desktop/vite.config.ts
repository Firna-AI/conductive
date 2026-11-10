import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { SITE_FOLDER } from '../src/shared/site-build.ts'
import { DEFAULT_APP_ORIGIN, readConfiguration } from './src/config.ts'

export default defineConfig({
  root: resolve(import.meta.dirname, '..'),
  define: {
    __CONDUCTIVE_APP_ORIGIN__: JSON.stringify(
      readConfiguration({
        appOrigin: process.env.CONDUCTIVE_APP_ORIGIN ?? DEFAULT_APP_ORIGIN,
      }).appOrigin,
    ),
  },
  plugins: [
    react(),
    {
      name: 'conductive-desktop-chrome',
      transformIndexHtml: {
        order: 'pre',
        handler: (html) =>
          html.replace(
            'src="/src/main.tsx"',
            'src="/desktop/renderer/main.tsx"',
          ),
      },
    },
    {
      // The build copies the public folder, which also holds the built
      // marketing site. The Mac app does not show the site.
      name: 'conductive-desktop-without-site',
      apply: 'build',
      async writeBundle(options) {
        if (options.dir) {
          await rm(resolve(options.dir, SITE_FOLDER), {
            recursive: true,
            force: true,
          })
        }
      },
    },
  ],
  build: {
    outDir: resolve(import.meta.dirname, 'dist/bundle/web'),
    emptyOutDir: true,
  },
})
