import { createReadStream, createWriteStream } from 'node:fs'
import { open, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { pipeline } from 'node:stream/promises'
import type { ImportGitDiskFacts } from '../../../src/shared/conductor-import-manifest.ts'
import { git } from './git.ts'
import { bundleHeader } from './package-git.ts'
import { privateDirectory } from './stage-state.ts'
import type { SourceInventory } from './types.ts'
import { LocalImportError } from './types.ts'

export async function reconstructedObjects(
  sourceDirectory: string,
  directory: string,
  source: SourceInventory,
  bundle: string | null,
  signal: AbortSignal,
): Promise<ImportGitDiskFacts['reconstruction']> {
  if (!bundle) return { objectCount: 0, inflatedBytes: 0, maxObjectBytes: 0 }
  const repository = await privateDirectory(join(directory, 'completed.git'))
  await git(
    repository,
    [
      'init',
      '--bare',
      '--template=',
      `--object-format=${source.objectFormat}`,
      '.',
    ],
    signal,
  )
  await writeFile(
    join(repository, 'objects/info/alternates'),
    `${JSON.stringify(join(sourceDirectory, 'repository.git/objects'))}\n`,
    { mode: 0o600 },
  )
  const pack = join(directory, 'bundle.pack')
  const header = await bundleHeader(bundle, signal)
  await pipeline(
    createReadStream(bundle, { start: header.offset }),
    createWriteStream(pack, { flags: 'wx', mode: 0o600 }),
    { signal },
  )
  await git(repository, ['index-pack', '--stdin', '--fix-thin'], signal, {
    inputFile: pack,
  })
  const packs = await readdir(join(repository, 'objects/pack'))
  const index = packs.find((path) => path.endsWith('.idx'))
  if (!index) throw new LocalImportError('read_failed')
  const listing = join(directory, 'pack-objects')
  await git(
    repository,
    ['verify-pack', '-v', join(repository, 'objects/pack', index)],
    signal,
    { output: listing },
  )
  const names = join(directory, 'object-names')
  const output = await open(names, 'wx', 0o600)
  const lines = createInterface({
    input: createReadStream(listing),
    crlfDelay: Infinity,
  })
  try {
    for await (const line of lines) {
      signal.throwIfAborted()
      if (/^[a-f0-9]{40}(?:[a-f0-9]{24})? /.test(line))
        await output.writeFile(`${line.split(' ')[0]}\n`)
    }
  } finally {
    lines.close()
    await output.close()
  }
  const sizes = join(directory, 'object-sizes')
  await git(
    repository,
    ['cat-file', '--batch-check=%(objectname) %(objectsize)'],
    signal,
    { inputFile: names, output: sizes },
  )
  const objects = createInterface({
    input: createReadStream(sizes),
    crlfDelay: Infinity,
  })
  const result = { objectCount: 0, inflatedBytes: 0, maxObjectBytes: 0 }
  try {
    for await (const line of objects) {
      signal.throwIfAborted()
      const size = Number(line.split(' ')[1])
      if (!Number.isSafeInteger(size) || size < 0)
        throw new LocalImportError('read_failed')
      result.objectCount++
      result.inflatedBytes += size
      result.maxObjectBytes = Math.max(result.maxObjectBytes, size)
    }
  } finally {
    objects.close()
  }
  return result
}
