import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import {
  readImportLfsObject,
  type ImportLfsObject,
} from '../../../src/shared/conductor-import-lfs.ts'
import {
  importObject,
  importText,
  importList,
} from '../../../src/shared/conductor-import-values.ts'
import { digest, missing } from './safe-files.ts'
import { readState } from './stage-state.ts'
import type { SourceFile, SourceInventory } from './types.ts'
import { LocalImportError } from './types.ts'

export const lfsKey = (object: ImportLfsObject) =>
  `${object.oid}:${object.sizeBytes}`
export const lfsPositiveDirectory = (directory: string, factsId: string) =>
  join(directory, 'lfs-positive', digest(factsId))

export function unchangedLfsFile(file: SourceFile) {
  return (
    file.kind === 'file' &&
    file.lfs !== undefined &&
    file.hash === file.lfs.payloadOid &&
    file.size === file.lfs.size &&
    (file.mode & 0o111 ? '100755' : '100644') === file.lfs.mode
  )
}

/** Only an explicit, matching GitHub payload availability result permits omission. */
export async function availableLfsFiles(
  directory: string,
  source: SourceInventory,
  factsId: string,
  signal: AbortSignal,
) {
  const available = new Set<string>()
  const root = lfsPositiveDirectory(directory, factsId)
  const pages = await readdir(root).catch((error: unknown) => {
    if (missing(error)) return []
    throw error
  })
  for (const page of pages) {
    signal.throwIfAborted()
    if (!/^(?:0|[1-9][0-9]*)$/.test(page))
      throw new LocalImportError('read_failed')
    const row = importObject(await readState(join(root, page)))
    if (importText(row.factsId) !== factsId)
      throw new LocalImportError('read_failed')
    for (const object of importList(row.available).map(readImportLfsObject))
      available.add(lfsKey(object))
  }
  return new Set(
    source.files
      .filter(
        (file) =>
          unchangedLfsFile(file) &&
          file.lfs &&
          available.has(
            lfsKey({ oid: file.lfs.payloadOid, sizeBytes: file.lfs.size }),
          ),
      )
      .map((file) => file.path),
  )
}
