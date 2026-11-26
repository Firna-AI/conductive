import type { FileEntry } from '../../src/shared/generated/FileEntry'
import type { FileTreeDelta } from '../../src/shared/generated/FileTreeDelta'
import {
  BUCKET_COUNT,
  BUCKET_SYMBOLS,
  bucketKey,
  bucketOf,
  type BucketInfo,
  type BucketList,
} from './bucket-layout'
import { readOrderText, writeBucket, writeOrder } from './bucket-write'
import { invalidFileResponse } from './errors'
import { parseTree } from './parsers'
import { chunkKeys, readStoredText } from './stored-chunks'
import type { FilesReader, FilesTransaction } from './storage'
import { treeFieldsForRevision, validTreeOmissionCount } from './tree-omission'

type BucketEdit =
  | { type: 'delete'; path: string }
  | { type: 'put'; entry: FileEntry; changeIndex: number }

function groupChanges(changes: FileTreeDelta['changes']) {
  const removals = new Map<string, number>()
  const edits = new Map<number, BucketEdit[]>()
  function addEdit(path: string, edit: BucketEdit) {
    const bucket = bucketOf(path)
    const group = edits.get(bucket)
    if (group) group.push(edit)
    else edits.set(bucket, [edit])
  }
  for (const [changeIndex, change] of changes.entries()) {
    if (change.operation === 'remove') {
      removals.set(change.path, changeIndex)
    } else {
      if (change.operation === 'move')
        addEdit(change.previousPath, {
          type: 'delete',
          path: change.previousPath,
        })
      addEdit(change.entry.path, {
        type: 'put',
        entry: change.entry,
        changeIndex,
      })
    }
  }
  return { edits, removals }
}

function lastRemoval(
  path: string,
  removals: ReadonlyMap<string, number>,
): number {
  let index = -1
  if (removals.size === 0) return index
  while (true) {
    index = Math.max(index, removals.get(path) ?? -1)
    const slash = path.lastIndexOf('/')
    if (slash < 0) return index
    path = path.slice(0, slash)
  }
}

async function readTreeBucket(
  storage: FilesReader,
  bucket: number,
  info: BucketInfo,
): Promise<readonly FileEntry[]> {
  if (info.count === 0 && info.chunks === 0) return []
  const text = await readStoredText(
    storage,
    chunkKeys(info.chunks, (index) => bucketKey('tree', bucket, index)),
  )
  let rawEntries: unknown
  try {
    rawEntries = JSON.parse(text)
  } catch {
    throw invalidFileResponse()
  }
  const { entries } = parseTree({ revision: 0, entries: rawEntries })
  if (entries.length !== info.count) throw invalidFileResponse()
  return entries
}

function editBucket(
  original: readonly FileEntry[],
  edits: readonly BucketEdit[],
  removals: ReadonlyMap<string, number>,
) {
  const items = new Map<string, { entry: FileEntry; offset: number }>()
  const removed = new Set<number>()
  for (const [offset, entry] of original.entries()) {
    if (lastRemoval(entry.path, removals) >= 0) {
      removed.add(offset)
    } else {
      const previous = items.get(entry.path)
      if (previous) removed.add(offset)
      items.set(entry.path, { entry, offset: previous?.offset ?? offset })
    }
  }

  // The last removal hides earlier puts at the path. A move always deletes its source.
  for (const edit of edits) {
    if (edit.type === 'delete') {
      const previous = items.get(edit.path)
      if (previous && previous.offset < original.length)
        removed.add(previous.offset)
      items.delete(edit.path)
    } else if (edit.changeIndex > lastRemoval(edit.entry.path, removals)) {
      const previous = items.get(edit.entry.path)
      items.set(edit.entry.path, {
        entry: edit.entry,
        offset: previous?.offset ?? original.length + edit.changeIndex,
      })
    }
  }

  const entries: FileEntry[] = []
  const insertions: number[] = []
  for (const { entry, offset } of items.values()) {
    entries.push(entry)
    if (offset >= original.length) insertions.push(offset - original.length)
  }
  return { entries, removed, insertions }
}

function retainOrder(
  order: string,
  buckets: readonly BucketInfo[],
  removed: ReadonlyMap<number, ReadonlySet<number>>,
): string {
  const offsets = Array<number>(BUCKET_COUNT).fill(0)
  let retained = ''
  for (const symbol of order) {
    const bucket = BUCKET_SYMBOLS.indexOf(symbol)
    if (bucket < 0 || offsets[bucket] >= buckets[bucket].count)
      throw invalidFileResponse()
    if (!removed.get(bucket)?.has(offsets[bucket])) retained += symbol
    offsets[bucket]++
  }
  return retained
}

export async function writeTreeDelta(
  transaction: FilesTransaction,
  tree: BucketList,
  delta: FileTreeDelta,
): Promise<BucketList> {
  const { edits, removals } = groupChanges(delta.changes)
  const buckets = [...tree.buckets]
  const removed = new Map<number, ReadonlySet<number>>()
  const insertions = new Map<number, number>()
  for (const [bucket, previous] of tree.buckets.entries()) {
    const group = edits.get(bucket)
    if (!group && removals.size === 0) continue
    const original = await readTreeBucket(transaction, bucket, previous)
    const result = editBucket(original, group ?? [], removals)
    if (result.removed.size > 0) removed.set(bucket, result.removed)
    for (const index of result.insertions) insertions.set(index, bucket)
    if (group || result.removed.size > 0)
      buckets[bucket] = await writeBucket(
        transaction,
        'tree',
        bucket,
        result.entries,
        previous,
      )
  }
  let orderChunks = tree.orderChunks
  if (removed.size > 0 || insertions.size > 0) {
    const previousOrder = await readOrderText(transaction, 'tree', tree)
    let order = retainOrder(previousOrder, tree.buckets, removed)
    for (const [, bucket] of [...insertions].sort(([a], [b]) => a - b))
      order += BUCKET_SYMBOLS[bucket]
    orderChunks = await writeOrder(
      transaction,
      'tree',
      order,
      previousOrder,
      tree.orderChunks,
    )
  }
  return {
    ...tree,
    fields: treeFieldsForRevision(
      tree.fields,
      delta.revision,
      delta.omittedEntryCount ?? validTreeOmissionCount(tree.fields),
    ),
    count: buckets.reduce((count, bucket) => count + bucket.count, 0),
    orderChunks,
    buckets,
  }
}
