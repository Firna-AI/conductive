import { join } from 'node:path'
import { git, sourceGit } from './git.ts'
import { sourceInventory } from './inventory.ts'
import { readSource } from './source.ts'
import {
  capturedFile,
  capturedNative,
  privateDirectory,
  privateTree,
} from './stage-state.ts'
import { FILE_LIMIT_BYTES, readSourceFile, sourcePath } from './safe-files.ts'
import type { ImportLocations, SourceInventory } from './types.ts'
import { LocalImportError } from './types.ts'

export async function currentSource(
  locations: ImportLocations,
  localWorkspaceId: string,
  signal: AbortSignal,
) {
  signal.throwIfAborted()
  const workspace = readSource(locations).find(
    (item) => item.row.localWorkspaceId === localWorkspaceId,
  )
  if (!workspace) throw new LocalImportError('source_missing')
  return sourceInventory(locations, workspace, signal)
}

export async function captureSource(
  locations: ImportLocations,
  directory: string,
  source: SourceInventory,
  signal: AbortSignal,
) {
  const root = source.workspace.path
  if (!root) throw new LocalImportError('source_missing')
  await privateDirectory(join(directory, 'files'))
  await privateDirectory(join(directory, 'native'))
  for (const [index, file] of source.files.entries()) {
    signal.throwIfAborted()
    if (file.kind !== 'file' || file.size > FILE_LIMIT_BYTES) continue
    const copied = await readSourceFile(
      sourcePath(root, file.path),
      signal,
      capturedFile(directory, index),
      file.identity,
    )
    if (copied.hash !== file.hash || copied.size !== file.size)
      throw new LocalImportError('source_changed')
  }
  for (const [index, memory] of source.native.entries()) {
    signal.throwIfAborted()
    if (!memory.path || !memory.identity || !memory.hash) continue
    const copied = await readSourceFile(
      memory.path,
      signal,
      capturedNative(directory, index, memory.path),
      memory.identity,
    )
    if (copied.hash !== memory.hash)
      throw new LocalImportError('source_changed')
  }
  const repository = await privateDirectory(join(directory, 'repository.git'))
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
  const pack = join(directory, 'captured.pack')
  const run = await sourceGit(root, signal)
  await run(['pack-objects', '--stdout', '--revs'], {
    input: `${source.headOid}\n`,
    output: pack,
  })
  await git(repository, ['index-pack', '--stdin'], signal, { inputFile: pack })
  await git(
    repository,
    ['update-ref', 'refs/heads/import', source.headOid],
    signal,
  )
  await privateTree(repository)
  const fresh = await currentSource(
    locations,
    source.workspace.row.localWorkspaceId,
    signal,
  )
  if (fresh.digest !== source.digest)
    throw new LocalImportError('source_changed')
}
