import { join } from 'node:path'
import {
  readImportLfsObject,
  type ImportLfsObject,
} from '../../../src/shared/conductor-import-lfs.ts'
import {
  importInteger,
  importList,
  importObject,
  importText,
} from '../../../src/shared/conductor-import-values.ts'
import {
  lfsKey,
  lfsPositiveDirectory,
  unchangedLfsFile,
} from './package-lfs.ts'
import { missing } from './safe-files.ts'
import { readStageBuild, readStageSource } from './stage-read.ts'
import {
  privateDirectory,
  readState,
  stageDirectory,
  writeState,
} from './stage-state.ts'
import type { ImportLocations, SourceInventory } from './types.ts'
import { LocalImportError } from './types.ts'

const pageSize = 256

export async function prepareLfsCandidates(
  directory: string,
  source: SourceInventory,
  signal: AbortSignal,
) {
  const objects = new Map<string, ImportLfsObject>()
  for (const file of source.files) {
    signal.throwIfAborted()
    if (!unchangedLfsFile(file) || !file.lfs) continue
    const object = { oid: file.lfs.payloadOid, sizeBytes: file.lfs.size }
    objects.set(lfsKey(object), object)
  }
  const ordered = [...objects.values()].sort((left, right) =>
    lfsKey(left).localeCompare(lfsKey(right), 'en'),
  )
  const root = await privateDirectory(join(directory, 'lfs-candidates'))
  for (let offset = 0; offset < ordered.length; offset += pageSize)
    await writeState(
      join(root, String(offset / pageSize)),
      ordered.slice(offset, offset + pageSize),
    )
  await writeState(join(root, 'count'), ordered.length)
}

export async function stageLfsPage(
  locations: ImportLocations,
  id: string,
  offset: number,
  signal: AbortSignal,
): Promise<{ objects: ImportLfsObject[]; nextCursor: number | null }> {
  signal.throwIfAborted()
  importInteger(offset)
  const root = join(stageDirectory(locations, id), 'lfs-candidates')
  const count = importInteger(await readState(join(root, 'count')))
  if (offset >= count) return { objects: [], nextCursor: null }
  const first = Math.floor(offset / pageSize)
  const load = async (page: number) =>
    importList(await readState(join(root, String(page)))).map(
      readImportLfsObject,
    )
  const objects = (await load(first)).slice(offset % pageSize)
  if (objects.length < pageSize && (first + 1) * pageSize < count)
    objects.push(...(await load(first + 1)).slice(0, pageSize - objects.length))
  signal.throwIfAborted()
  return {
    objects,
    nextCursor:
      offset + objects.length < count ? offset + objects.length : null,
  }
}

export async function recordLfsPage(
  locations: ImportLocations,
  id: string,
  factsId: string,
  page: number,
  available: ImportLfsObject[],
  signal: AbortSignal,
) {
  signal.throwIfAborted()
  importText(factsId)
  importInteger(page)
  const directory = stageDirectory(locations, id)
  const current = await readState(join(directory, 'current.json')).catch(
    (error: unknown) => {
      if (missing(error)) return null
      throw error
    },
  )
  if (current !== null && readStageBuild(current).sealed)
    throw new LocalImportError('read_failed')
  const source = readStageSource(
    await readState(join(directory, 'source.json')),
  ).source
  const candidates = new Set(
    source.files.flatMap((file) =>
      unchangedLfsFile(file) && file.lfs
        ? [lfsKey({ oid: file.lfs.payloadOid, sizeBytes: file.lfs.size })]
        : [],
    ),
  )
  const objects = available
    .map(readImportLfsObject)
    .sort((left, right) => lfsKey(left).localeCompare(lfsKey(right), 'en'))
  if (objects.some((object) => !candidates.has(lfsKey(object))))
    throw new LocalImportError('read_failed')
  const root = await privateDirectory(lfsPositiveDirectory(directory, factsId))
  const path = join(root, String(page))
  const previous = await readState(path).catch((error: unknown) => {
    if (missing(error)) return null
    throw error
  })
  const value = { factsId, available: objects }
  if (
    previous !== null &&
    JSON.stringify(importObject(previous)) !== JSON.stringify(value)
  )
    throw new LocalImportError('read_failed')
  await writeState(path, value)
}
