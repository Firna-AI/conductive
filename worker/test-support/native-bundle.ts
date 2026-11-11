import { join } from 'node:path'

declare module 'vitest' {
  interface ProvidedContext {
    nativeWorkspaceBundle?: string
  }
}

let standaloneBundle: Promise<string> | undefined

export async function nativeWorkspaceBundle(): Promise<string> {
  if (process.env.VITEST_WORKER_ID !== undefined) {
    const { inject } = await import('vitest')
    const provided = inject('nativeWorkspaceBundle')
    if (provided !== undefined) return provided
  }
  return (standaloneBundle ??= buildNativeWorkspaceBundle())
}

export async function buildNativeWorkspaceBundle(): Promise<string> {
  const { build } = await import('vite')
  const bundle = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: false,
      target: 'es2022',
      lib: {
        entry: join(import.meta.dirname, 'native-workspace-entry.ts'),
        formats: ['es'],
      },
      rolldownOptions: {
        platform: 'neutral',
        external: ['cloudflare:workers', /^node:/],
      },
    },
  })
  const outputs = (Array.isArray(bundle) ? bundle : [bundle]).flatMap(
    (result) => ('output' in result ? result.output : []),
  )
  const entry = outputs.find(
    (output) => output.type === 'chunk' && output.isEntry,
  )
  if (!entry || entry.type !== 'chunk')
    throw new Error('The native workspace bundle is missing.')
  return entry.code
}
