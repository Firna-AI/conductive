import type { BrowserChangesResponse } from '../../src/shared/generated/BrowserChangesResponse'
import type { FileTreeResponse } from '../../src/shared/generated/FileTreeResponse'
import {
  convertFilesProjection,
  readLegacyTreeRevision,
} from './bucket-convert'
import { writeTreeDelta } from './bucket-delta'
import { BUCKET_LAYOUT, FILES_KEY } from './bucket-layout'
import { emptyBucketManifest, writeBucketList } from './bucket-write'
import { invalidFileResponse } from './errors'
import { natural, parseFileEvent } from './parsers'
import {
  readFileList,
  readFilesManifest,
  type FilesManifest,
  type FilesReader,
  type FilesStorage,
  type FilesTransaction,
} from './storage'
import { treeFieldsForRevision } from './tree-omission'

export async function beginFilesConnection(
  transaction: FilesTransaction,
  connectionId: string,
): Promise<void> {
  const previous = await readFilesManifest(transaction)
  const manifest =
    previous.layout !== BUCKET_LAYOUT &&
    previous.treeChunks === 0 &&
    previous.changesChunks === 0
      ? emptyBucketManifest(previous)
      : previous
  await transaction.put(FILES_KEY, {
    ...manifest,
    connectionId,
    hasSnapshot: false,
  })
}

async function treeRevision(
  storage: FilesReader,
  manifest: FilesManifest,
): Promise<number | null> {
  if (manifest.layout === BUCKET_LAYOUT) {
    if (!manifest.tree) return null
    const revision = manifest.tree.fields.revision
    if (!natural(revision)) throw invalidFileResponse()
    return revision
  }
  return manifest.treeChunks > 0
    ? readLegacyTreeRevision(storage, manifest.treeChunks)
    : null
}

export async function applyFilesEvent(
  transaction: FilesTransaction,
  connectionId: string,
  value: unknown,
): Promise<boolean> {
  const previous = await readFilesManifest(transaction)
  if (previous.connectionId !== connectionId) return false
  const event = parseFileEvent(value)
  if (event.type === 'changes.changed') throw invalidFileResponse()
  if (event.type === 'files.changed' || event.type === 'files.snapshot') {
    const revision = previous.hasSnapshot
      ? await treeRevision(transaction, previous)
      : null
    if (event.type === 'files.changed') {
      if (revision === null || event.delta.revision <= revision) return false
    } else if (revision !== null && event.tree.revision <= revision)
      return false
  }

  const manifest = await convertFilesProjection(transaction, previous)
  if (event.type === 'files.unavailable') {
    if (manifest.tree)
      manifest.tree = {
        ...manifest.tree,
        fields: { ...manifest.tree.fields, unavailable: true },
      }
    else
      manifest.tree = await writeBucketList(
        transaction,
        'tree',
        { revision: 0, unavailable: true },
        [],
        null,
      )
  } else if (event.type === 'changes.updated') {
    const { files, ...fields } = event.changes
    manifest.changes = await writeBucketList(
      transaction,
      'changes',
      fields,
      files,
      manifest.changes,
    )
  } else if (event.type === 'files.snapshot') {
    const { entries, ...fields } = event.tree
    manifest.tree = await writeBucketList(
      transaction,
      'tree',
      treeFieldsForRevision(fields, fields.revision, fields.omittedEntryCount),
      entries,
      manifest.tree,
    )
    manifest.hasSnapshot = true
  } else {
    if (!manifest.tree) throw invalidFileResponse()
    manifest.tree = await writeTreeDelta(
      transaction,
      manifest.tree,
      event.delta,
    )
  }
  await transaction.put(FILES_KEY, manifest)
  return true
}

export class FilesState {
  private readonly storage: FilesStorage
  private queue: Promise<unknown> = Promise.resolve()

  constructor(storage: FilesStorage) {
    this.storage = storage
  }

  /** The owner supplies a fresh ID for each accepted physical connection. */
  beginConnection(connectionId: string): Promise<void> {
    return this.serialize(() =>
      this.storage.transaction((transaction) =>
        beginFilesConnection(transaction, connectionId),
      ),
    )
  }

  /** Call only after the owner accepts the envelope in contiguous event order. */
  apply(connectionId: string, value: unknown): Promise<boolean> {
    return this.serialize(() =>
      this.storage.transaction((transaction) =>
        applyFilesEvent(transaction, connectionId, value),
      ),
    )
  }

  tree(): Promise<FileTreeResponse | null> {
    return this.serialize(async () =>
      readFileList(this.storage, await readFilesManifest(this.storage), 'tree'),
    )
  }

  changes(): Promise<BrowserChangesResponse | null> {
    return this.serialize(async () =>
      readFileList(
        this.storage,
        await readFilesManifest(this.storage),
        'changes',
      ),
    )
  }

  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation)
    this.queue = result.catch(() => undefined)
    return result
  }
}
