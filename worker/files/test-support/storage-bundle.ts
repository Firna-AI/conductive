import { fileURLToPath } from 'node:url'

import { cachedTestBundle } from '../../test-support/test-bundles'

/** Build the real adapter with its imports, without root Vite config or disk output. */
export function storageWorkerBundle(): Promise<string> {
  return cachedTestBundle('files-storage-worker', buildStorageWorkerBundle)
}

async function buildStorageWorkerBundle(): Promise<string> {
  const { build } = await import('vite')
  const result = await build({
    configFile: false,
    envFile: false,
    publicDir: false,
    logLevel: 'silent',
    build: {
      write: false,
      emptyOutDir: false,
      copyPublicDir: false,
      minify: false,
      lib: {
        entry: fileURLToPath(
          new URL('./storage-worker.ts', import.meta.url).href,
        ),
        formats: ['es'],
        fileName: 'storage-worker',
      },
      rolldownOptions: { external: ['cloudflare:workers'] },
    },
  })
  const outputs = Array.isArray(result) ? result : [result]
  const output = outputs[0]
  if (outputs.length !== 1 || !output || !('output' in output)) {
    throw new Error('Expected one storage worker bundle')
  }
  const entry = output.output.find(
    (chunk) => chunk.type === 'chunk' && chunk.isEntry,
  )
  if (!entry || entry.type !== 'chunk')
    throw new Error('Missing storage worker entry')
  return entry.code
}
