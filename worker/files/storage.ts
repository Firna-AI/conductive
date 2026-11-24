import type { ChangesResponse } from '../../src/shared/generated/ChangesResponse'
import type { FileTreeResponse } from '../../src/shared/generated/FileTreeResponse'
import { isRecord } from '../http'
import {
  BUCKET_LAYOUT,
  CHUNK_CHARACTERS,
  FILES_KEY,
  bucketListKeys,
  parseBucketManifest,
  type BucketManifest,
  type ListKind,
} from './bucket-layout'
import { readBucketList } from './bucket-read'
import { invalidFileResponse } from './errors'
import { natural, parseChanges, parseTree } from './parsers'

export interface FilesStorage {
  get(key: string): Promise<unknown>
  getMany(keys: readonly string[]): Promise<ReadonlyMap<string, unknown>>
  /** All updates and removals commit together. */
  write(
    updates: Readonly<Record<string, unknown>>,
    removals: readonly string[],
  ): Promise<void>
}

export interface StoredFiles {
  connectionId: string | null
  hasSnapshot: boolean
  tree: FileTreeResponse | null
  changes: ChangesResponse | null
}

interface OldFilesManifest {
  layout?: never
  connectionId: string | null
  hasSnapshot: boolean
  treeChunks: number
  changesChunks: number
}

export type FilesManifest = OldFilesManifest | BucketManifest

export function durableFilesStorage(
  storage: Pick<DurableObjectStorage, 'get' | 'transaction'>,
): FilesStorage {
  return {
    get: (key) => storage.get<unknown>(key),
    async getMany(keys) {
      const values = new Map<string, unknown>()
      for (let index = 0; index < keys.length; index += 64) {
        const chunk = await storage.get<unknown>(keys.slice(index, index + 64))
        for (const [key, value] of chunk) values.set(key, value)
      }
      return values
    },
    write: (updates, removals) =>
      storage.transaction(async (transaction) => {
        for (const [key, value] of Object.entries(updates))
          await transaction.put(key, value)
        for (const key of removals) await transaction.delete(key)
      }),
  }
}

export async function readFilesManifest(
  storage: FilesStorage,
): Promise<FilesManifest> {
  const value = await storage.get(FILES_KEY)
  if (value === undefined)
    return {
      connectionId: null,
      hasSnapshot: false,
      treeChunks: 0,
      changesChunks: 0,
    }
  if (!isRecord(value)) throw invalidFileResponse()
  if (Object.hasOwn(value, 'layout')) return parseBucketManifest(value)
  if (
    (value.connectionId !== null && typeof value.connectionId !== 'string') ||
    typeof value.hasSnapshot !== 'boolean' ||
    !natural(value.treeChunks) ||
    !natural(value.changesChunks)
  )
    throw invalidFileResponse()
  return {
    connectionId: value.connectionId,
    hasSnapshot: value.hasSnapshot,
    treeChunks: value.treeChunks,
    changesChunks: value.changesChunks,
  }
}

async function readChunks(
  storage: FilesStorage,
  kind: ListKind,
  count: number,
): Promise<unknown> {
  const chunks: string[] = []
  const keys = Array.from(
    { length: count },
    (_, index) => `${FILES_KEY}:${kind}:${index}`,
  )
  const values = await storage.getMany(keys)
  for (let index = 0; index < count; index++) {
    const chunk = values.get(keys[index])
    if (typeof chunk !== 'string') throw invalidFileResponse()
    chunks.push(chunk)
  }
  try {
    return JSON.parse(chunks.join(''))
  } catch {
    throw invalidFileResponse()
  }
}

export function readFileList(
  storage: FilesStorage,
  manifest: FilesManifest,
  kind: 'tree',
): Promise<FileTreeResponse | null>
export function readFileList(
  storage: FilesStorage,
  manifest: FilesManifest,
  kind: 'changes',
): Promise<ChangesResponse | null>
export function readFileList(
  storage: FilesStorage,
  manifest: FilesManifest,
  kind: ListKind,
): Promise<FileTreeResponse | ChangesResponse | null>
export async function readFileList(
  storage: FilesStorage,
  manifest: FilesManifest,
  kind: ListKind,
): Promise<FileTreeResponse | ChangesResponse | null> {
  let value: unknown
  if (manifest.layout === BUCKET_LAYOUT) {
    const list = manifest[kind]
    if (list === null) return null
    value = await readBucketList(storage, kind, list)
  } else {
    const count = manifest[`${kind}Chunks`]
    if (count === 0) return null
    value = await readChunks(storage, kind, count)
  }
  return kind === 'tree' ? parseTree(value) : parseChanges(value)
}

export async function loadFiles(storage: FilesStorage): Promise<StoredFiles> {
  const stored = await readFilesManifest(storage)
  return {
    connectionId: stored.connectionId,
    hasSnapshot: stored.hasSnapshot,
    tree: await readFileList(storage, stored, 'tree'),
    changes: await readFileList(storage, stored, 'changes'),
  }
}

export async function saveFiles(
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
  await storage.write(updates, removals)
}

/**
 * After a repository change, the stored reports are of the old folder. The
 * tree keeps its entries and its revision with the unavailable mark, so a
 * later delta still applies, and the next complete tree clears the mark.
 * The changes go, so the Changes API waits for the report of the new folder.
 */
export async function markFilesMoved(storage: FilesStorage): Promise<void> {
  const state = await loadFiles(storage)
  if (!state.tree && !state.changes) return
  await saveFiles(storage, {
    ...state,
    tree: state.tree && { ...state.tree, unavailable: true },
    changes: null,
  })
}
