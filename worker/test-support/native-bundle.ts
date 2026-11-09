import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { build } from 'vite'

let pendingBundle: Promise<string> | undefined

export function nativeWorkspaceBundle(): Promise<string> {
  return (pendingBundle ??= bundle())
}

async function bundle(): Promise<string> {
  const root = join(import.meta.dirname, '../..')
  const sources = (
    await Promise.all(
      ['worker', 'src/shared'].map(async (area) => {
        const entries = await readdir(join(root, area), {
          recursive: true,
          withFileTypes: true,
        })
        return entries
          .filter(
            (entry) =>
              entry.isFile() &&
              entry.name.endsWith('.ts') &&
              !entry.name.endsWith('.test.ts'),
          )
          .map((entry) => join(entry.parentPath, entry.name))
      }),
    )
  )
    .flat()
    .sort()
  const hash = createHash('sha256')
  for (const source of sources) {
    hash.update(source)
    hash.update(await readFile(source))
  }
  const directory = join(
    root,
    '.context/boat-native-remote-workspaces/5f/native-bundles',
  )
  const path = join(directory, `${hash.digest('hex')}.mjs`)
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT'))
      throw error
  }
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
      rolldownOptions: { external: ['cloudflare:workers'] },
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
  await mkdir(directory, { recursive: true })
  const temporary = `${path}.${process.pid}.tmp`
  await writeFile(temporary, entry.code)
  await rename(temporary, path)
  return entry.code
}
