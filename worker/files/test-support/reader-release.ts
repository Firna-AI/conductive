import {
  BUCKET_LAYOUT,
  CHUNK_CHARACTERS,
  FILES_KEY,
  bucketListKeys,
} from '../bucket-layout'
import { readFilesManifest, type FilesStorage } from '../storage'
import { writeStorageRecord, type StoredFiles } from './storage-record'

/** The saveFiles body from the reader release at aeaf6234d, with the current storage adapter. */
export async function saveReaderReleaseFiles(
  storage: FilesStorage,
  state: StoredFiles,
): Promise<void> {
  const previous = await readFilesManifest(storage)
  const updates: Record<string, unknown> = {}
  const removals: string[] = []
  const counts = { treeChunks: 0, changesChunks: 0 }
  for (const kind of ['tree', 'changes'] as const) {
    const text = state[kind] === null ? '' : JSON.stringify(state[kind])
    const count = Math.ceil(text.length / CHUNK_CHARACTERS)
    counts[`${kind}Chunks`] = count
    for (let index = 0; index < count; index++) {
      updates[`${FILES_KEY}:${kind}:${index}`] = text.slice(
        index * CHUNK_CHARACTERS,
        (index + 1) * CHUNK_CHARACTERS,
      )
    }
    for (let index = count; index < previous[`${kind}Chunks`]; index++)
      removals.push(`${FILES_KEY}:${kind}:${index}`)
    if (previous.layout === BUCKET_LAYOUT) {
      for (const key of bucketListKeys(kind, previous[kind])) removals.push(key)
    }
  }
  updates[FILES_KEY] = {
    connectionId: state.connectionId,
    hasSnapshot: state.hasSnapshot,
    ...counts,
  }
  await writeStorageRecord(storage, updates, removals)
}
