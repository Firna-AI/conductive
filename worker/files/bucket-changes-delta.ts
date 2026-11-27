import type { BranchChangedFile } from '../../src/shared/generated/BranchChangedFile'
import type { ChangesDelta } from '../../src/shared/generated/ChangesDelta'
import type { ChangesDeltaUpsert } from '../../src/shared/generated/ChangesDeltaUpsert'
import type { ChangesResponseSummary } from '../../src/shared/generated/ChangesResponseSummary'
import {
  BUCKET_COUNT,
  BUCKET_LAYOUT,
  BUCKET_SYMBOLS,
  FILES_KEY,
  bucketOf,
  type BucketList,
} from './bucket-layout'
import { readBucket } from './bucket-read'
import { readOrderText, writeBucket, writeOrder } from './bucket-write'
import { invalidFileResponse, invalidRunnerReport } from './errors'
import { parseChangedFile, parseChangesSummary } from './parsers'
import { readFilesManifest, type FilesTransaction } from './storage'

interface ChangedBucket {
  original: readonly BranchChangedFile[]
  removed: ReadonlySet<number>
  files: BranchChangedFile[]
}

type BucketUpsert = ChangesDeltaUpsert & { bucket: number }

async function readEdits(
  transaction: FilesTransaction,
  list: BucketList,
  delta: ChangesDelta,
) {
  const { removes, upserts: operations, ...fields } = delta
  const paths = new Set(removes)
  if (paths.size !== removes.length) invalidRunnerReport()
  const missing = new Set(paths)
  const touched = new Set(removes.map(bucketOf))
  let lastIndex = -1
  const upserts = operations.map((upsert): BucketUpsert => {
    const { index, file } = upsert
    if (index <= lastIndex || paths.has(file.path)) invalidRunnerReport()
    lastIndex = index
    paths.add(file.path)
    const bucket = bucketOf(file.path)
    touched.add(bucket)
    return { ...upsert, bucket }
  })

  const summary = parseChangesSummary(list.fields.summary)
  if (!summary || summary.files !== list.count) throw invalidFileResponse()
  const edits = new Map<number, ChangedBucket>()
  for (const bucket of touched) {
    const original = (
      await readBucket(transaction, 'changes', bucket, list.buckets[bucket])
    ).map(parseChangedFile)
    const removed = new Set<number>()
    for (const [offset, file] of original.entries()) {
      if (!paths.has(file.path)) continue
      removed.add(offset)
      missing.delete(file.path)
      adjustSummary(summary, file, -1)
    }
    edits.set(bucket, { original, removed, files: [] })
  }
  for (const { file } of upserts) adjustSummary(summary, file, 1)
  if (
    missing.size > 0 ||
    lastIndex >= summary.files ||
    summary.files !== delta.summary.files ||
    summary.added !== delta.summary.added ||
    summary.removed !== delta.summary.removed
  )
    invalidRunnerReport()
  return { edits, upserts, fields }
}

function adjustSummary(
  summary: ChangesResponseSummary,
  file: BranchChangedFile,
  direction: -1 | 1,
): void {
  summary.files += direction
  summary.added += direction * file.added
  summary.removed += direction * file.removed
}

/** Fill the new order and the edited buckets in the same pass. */
function applyOrder(
  previousOrder: string,
  list: BucketList,
  edits: ReadonlyMap<number, ChangedBucket>,
  upserts: readonly BucketUpsert[],
): string {
  const offsets = Array<number>(BUCKET_COUNT).fill(0)
  const order: string[] = []
  let next = 0
  function insertUpserts() {
    while (upserts[next]?.index === order.length) {
      const { bucket, file } = upserts[next++]
      order.push(BUCKET_SYMBOLS[bucket])
      edits.get(bucket)?.files.push(file)
    }
  }
  for (const symbol of previousOrder) {
    const bucket = BUCKET_SYMBOLS.indexOf(symbol)
    if (bucket < 0 || offsets[bucket] >= list.buckets[bucket].count)
      throw invalidFileResponse()
    const offset = offsets[bucket]++
    const edit = edits.get(bucket)
    if (edit?.removed.has(offset)) continue
    insertUpserts()
    order.push(symbol)
    if (edit) edit.files.push(edit.original[offset])
  }
  insertUpserts()
  return order.join('')
}

export async function applyChangesDelta(
  transaction: FilesTransaction,
  streamId: string,
  delta: ChangesDelta,
): Promise<void> {
  const manifest = await readFilesManifest(transaction)
  if (
    manifest.layout !== BUCKET_LAYOUT ||
    manifest.connectionId !== streamId ||
    !manifest.changes
  )
    return invalidRunnerReport()
  const list = manifest.changes
  const previousRevision = list.fields.revision
  if (previousRevision !== undefined && previousRevision !== delta.revision - 1)
    invalidRunnerReport()
  const { edits, upserts, fields } = await readEdits(transaction, list, delta)
  const buckets = [...list.buckets]
  let orderChunks = list.orderChunks
  if (edits.size > 0) {
    const previousOrder = await readOrderText(transaction, 'changes', list)
    const order = applyOrder(previousOrder, list, edits, upserts)
    for (const [bucket, { files }] of edits)
      buckets[bucket] = await writeBucket(
        transaction,
        'changes',
        bucket,
        files,
        buckets[bucket],
      )
    orderChunks = await writeOrder(
      transaction,
      'changes',
      order,
      previousOrder,
      list.orderChunks,
    )
  }
  manifest.changes = {
    fields,
    count: delta.summary.files,
    buckets,
    orderChunks,
  }
  await transaction.put(FILES_KEY, manifest)
}
