import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import {
  defineConfig,
  type ConfigEnv,
  type Plugin,
  type UserConfig,
} from 'vite'
import { errorReportingBuild } from './tools/build/error-reporting.ts'
import { readBuildRelease } from './tools/build/release.ts'

const release = readBuildRelease(import.meta.dirname)

export function developmentScripts() {
  const sources = new Map<string, string>()
  const modules = new Map<string, string>()
  return {
    name: 'conductive-external-development-scripts',
    apply: (_config: UserConfig, { command, isPreview }: ConfigEnv) =>
      command === 'serve' && !isPreview,
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html: string) {
        let index = 0
        return html.replace(
          /<!--[\s\S]*?-->|<script\b((?:"[^"]*"|'[^']*'|[^'">])*)>([\s\S]*?)<\/script\s*>/gi,
          (tag: string, attributes?: string, code?: string) => {
            if (
              attributes === undefined ||
              code === undefined ||
              /(?:^|\s)src(?:\s|=|$)/i.test(
                attributes.replace(/"[^"]*"|'[^']*'/g, ''),
              )
            )
              return tag
            const key = `${index++}:${code}`
            let source = sources.get(key)
            if (!source) {
              source = `/@conductive-dev-scripts/${sources.size}.js`
              sources.set(key, source)
              modules.set(`\0${source}`, code)
            }
            return `<script${attributes} src="${source}"></script>`
          },
        )
      },
    },
    resolveId(source: string): string | null {
      return modules.has(`\0${source}`) ? `\0${source}` : null
    },
    load(id: string): string | null {
      return modules.get(id) ?? null
    },
  } satisfies Plugin
}

export default defineConfig({
  define: { __CONDUCTIVE_RELEASE__: JSON.stringify(release) ?? 'undefined' },
  build: { sourcemap: 'hidden' },
  environments: {
    conductive: {
      build: {
        rolldownOptions: {
          output: {
            entryFileNames: 'index.js',
            chunkFileNames: 'chunk-[hash].js',
          },
        },
      },
    },
  },
  // Workers AI is remote only. Local development leaves new workspaces Untitled and needs no Cloudflare login.
  plugins: [
    react(),
    cloudflare({ remoteBindings: false }),
    developmentScripts(),
    errorReportingBuild({ release, settings: process.env }),
  ],
})
