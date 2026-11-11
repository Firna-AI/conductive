import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { buildVersion } from '../build-version.ts'
import { SITE_FOLDER } from '../src/shared/site-build.ts'
import { instrumentErrorReporting } from '../tools/build/error-reporting.ts'
import { readBuildRelease } from '../tools/build/release.ts'
import { DEFAULT_APP_ORIGIN, readConfiguration } from './src/config.ts'

const release = readBuildRelease(resolve(import.meta.dirname, '..'))

export default defineConfig({
  root: resolve(import.meta.dirname, '..'),
  define: {
    __CONDUCTIVE_RELEASE__: JSON.stringify(release) ?? 'undefined',
    __CONDUCTIVE_APP_VERSION__: JSON.stringify(buildVersion()),
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
    ...instrumentErrorReporting(release),
  ],
  build: {
    sourcemap: false,
    outDir: resolve(import.meta.dirname, 'dist/bundle/web'),
    emptyOutDir: true,
  },
})
