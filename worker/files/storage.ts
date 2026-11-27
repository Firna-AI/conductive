import type { BrowserChangesResponse } from '../../src/shared/generated/BrowserChangesResponse'
import type { FileTreeResponse } from '../../src/shared/generated/FileTreeResponse'
import { isRecord } from '../http'
import { convertFilesProjection } from './bucket-convert'
import {
  BUCKET_COUNT,
  BUCKET_LAYOUT,
  FILES_KEY,
  parseBucketManifest,
  type BucketManifest,
  type ListKind,
} from './bucket-layout'
import { readBucketList } from './bucket-read'
import { deleteBucketList } from './bucket-write'
import { invalidFileResponse } from './errors'
import { natural, parseChanges, parseTree } from './parsers'
import {
  deleteStoredChunks,
  legacyChunkKeys,
  readStoredText,
} from './stored-chunks'
import { validTreeOmissionCount } from './tree-omission'

export interface FilesReader {
  get(key: string): Promise<unknown>
  getMany(keys: readonly string[]): Promise<ReadonlyMap<string, unknown>>
}

export interface FilesTransaction extends FilesReader {
  put(key: string, value: unknown): Promise<void>
  delete(key: string): Promise<boolean>
}

export interface FilesStorage extends FilesReader {
  transaction<T>(
    work: (transaction: FilesTransaction) => Promise<T>,
  ): Promise<T>
}

interface OldFilesManifest {
  layout?: never
  connectionId: string | null
  hasSnapshot: boolean
  treeChunks: number
  changesChunks: number
}

export type FilesManifest = OldFilesManifest | BucketManifest

function durableFilesReader(
  storage: Pick<DurableObjectStorage, 'get'>,
): FilesReader {
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
  }
}

export function durableFilesStorage(
  storage: Pick<DurableObjectStorage, 'get' | 'transaction'>,
): FilesStorage {
  return {
    ...durableFilesReader(storage),
    transaction: (work) =>
      storage.transaction((transaction) =>
        work({
          ...durableFilesReader(transaction),
          put: (key, value) => transaction.put(key, value),
          delete: (key) => transaction.delete(key),
        }),
      ),
  }
}

export async function readFilesManifest(
  storage: FilesReader,
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
  storage: FilesReader,
  kind: ListKind,
  count: number,
): Promise<unknown> {
  const text = await readStoredText(storage, legacyChunkKeys(kind, count))
  try {
    return JSON.parse(text)
  } catch {
    throw invalidFileResponse()
  }
}

export function readFileList(
  storage: FilesReader,
  manifest: FilesManifest,
  kind: 'tree',
): Promise<FileTreeResponse | null>
export function readFileList(
  storage: FilesReader,
  manifest: FilesManifest,
  kind: 'changes',
): Promise<BrowserChangesResponse | null>
export function readFileList(
  storage: FilesReader,
  manifest: FilesManifest,
  kind: ListKind,
): Promise<FileTreeResponse | BrowserChangesResponse | null>
export async function readFileList(
  storage: FilesReader,
  manifest: FilesManifest,
  kind: ListKind,
): Promise<FileTreeResponse | BrowserChangesResponse | null> {
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
  if (kind === 'changes') return parseChanges(value)
  if (!isRecord(value)) throw invalidFileResponse()
  return parseTree({
    ...value,
    omittedEntryCount: validTreeOmissionCount(value),
  })
}

export function dropSavedChanges(storage: FilesStorage): Promise<void> {
  return storage.transaction(async (transaction) => {
    const value = await transaction.get(FILES_KEY)
    if (!isRecord(value)) throw invalidFileResponse()
    const manifest = parseBucketManifest({ ...value, changes: null })
    const changes = value.changes
    // A damaged descriptor can still contain usable chunk counts.
    if (isRecord(changes)) {
      const buckets = Array.isArray(changes.buckets)
        ? changes.buckets.slice(0, BUCKET_COUNT).map((bucket: unknown) => ({
            chunks:
              isRecord(bucket) && natural(bucket.chunks) ? bucket.chunks : 0,
          }))
        : []
      await deleteBucketList(transaction, 'changes', {
        orderChunks: natural(changes.orderChunks) ? changes.orderChunks : 0,
        buckets,
      })
    }
    await transaction.put(FILES_KEY, manifest)
  })
}

/**
 * After a repository change, the stored reports are of the old folder. The
 * tree keeps its entries and its revision with the unavailable mark, so a
 * later delta still applies, and the next complete tree clears the mark.
 * The changes go, so the Changes API waits for the report of the new folder.
 */
export function markFilesMoved(storage: FilesStorage): Promise<void> {
  return storage.transaction(async (transaction) => {
    const previous = await readFilesManifest(transaction)
    const hasLists =
      previous.layout === BUCKET_LAYOUT
        ? previous.tree !== null || previous.changes !== null
        : previous.treeChunks > 0 || previous.changesChunks > 0
    if (!hasLists) return

    const manifest =
      previous.layout === BUCKET_LAYOUT
        ? previous
        : await convertFilesProjection(transaction, {
            ...previous,
            changesChunks: 0,
          })
    if (previous.layout === BUCKET_LAYOUT)
      await deleteBucketList(transaction, 'changes', previous.changes)
    else
      await deleteStoredChunks(
        transaction,
        legacyChunkKeys('changes', previous.changesChunks),
      )
    if (manifest.tree)
      manifest.tree = {
        ...manifest.tree,
        fields: { ...manifest.tree.fields, unavailable: true },
      }
    manifest.changes = null
    await transaction.put(FILES_KEY, manifest)
  })
}
