import { createHash, randomUUID } from 'node:crypto'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

declare module 'vitest' {
  interface ProvidedContext {
    testBundleDirectory?: string
  }
}

const built = new Map<string, Promise<string>>()

/**
 * Builds a test Worker bundle once per run. The first test process that
 * needs `key` builds it and saves it in the folder of the global setup.
 * Other processes read that file. Without the folder, it builds on demand.
 */
export function cachedTestBundle(
  key: string,
  build: () => Promise<string>,
): Promise<string> {
  let bundle = built.get(key)
  if (!bundle) {
    bundle = readOrBuild(key, build)
    built.set(key, bundle)
    bundle.catch(() => built.delete(key))
  }
  return bundle
}

async function bundleDirectory(): Promise<string | undefined> {
  if (process.env.VITEST_WORKER_ID === undefined) return undefined
  const { inject } = await import('vitest')
  return inject('testBundleDirectory')
}

async function readOrBuild(
  key: string,
  build: () => Promise<string>,
): Promise<string> {
  const directory = await bundleDirectory()
  if (directory === undefined) return build()
  const name = createHash('sha256').update(key).digest('hex')
  const file = join(directory, `${name}.js`)
  try {
    return await readFile(file, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const code = await build()
  // Rename is atomic, so a concurrent reader sees no partial bundle.
  const partial = `${file}.${randomUUID()}.partial`
  await writeFile(partial, code)
  await rename(partial, file)
  return code
}

/** Builds a Worker entry once per run with `buildWorkerLibrary`. */
export function workerLibraryBundle(entry: string): Promise<string> {
  return cachedTestBundle(`library:${resolve(entry)}`, () =>
    buildWorkerLibrary(entry),
  )
}

/** Builds a Worker entry into one ES module with Vite's library mode. */
export async function buildWorkerLibrary(entry: string): Promise<string> {
  const { build } = await import('vite')
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: false,
      target: 'es2022',
      lib: { entry, formats: ['es'] },
      rolldownOptions: { external: ['cloudflare:workers'] },
    },
  })
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(
    (value) => ('output' in value ? value.output : []),
  )
  const chunk = outputs.find(
    (output) => output.type === 'chunk' && output.isEntry,
  )
  if (chunk?.type !== 'chunk')
    throw new Error(`The test bundle of ${entry} is missing.`)
  return chunk.code
}
