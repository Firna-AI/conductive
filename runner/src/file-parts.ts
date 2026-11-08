import {
  FILE_EVENT_MAX_BYTES,
  FILE_TREE_DELTA_MAX_CHANGES,
  type RunnerFileEvent,
} from '../../src/shared/files'
import { jsonBytes } from './event-limits'

/** Reserve the complete empty event, then add whole serialized entries. */
function groups<T>(
  items: readonly T[],
  maxCount: number,
  emptyBytes: (index: number) => number,
): T[][] | null {
  const result: T[][] = [[]]
  let group = result[0]
  let bytes = emptyBytes(0)
  if (bytes > FILE_EVENT_MAX_BYTES || !group) return null
  for (const item of items) {
    const size = jsonBytes(item)
    if (
      group.length === maxCount ||
      bytes + size + (group.length ? 1 : 0) > FILE_EVENT_MAX_BYTES
    ) {
      group = []
      result.push(group)
      bytes = emptyBytes(result.length - 1)
    }
    if (bytes + size > FILE_EVENT_MAX_BYTES) return null
    bytes += size + (group.length ? 1 : 0)
    group.push(item)
  }
  return result
}

/** The caller captures and filters one complete report before splitting it. */
export function splitFileReport(
  event: RunnerFileEvent,
): RunnerFileEvent[] | null {
  if (event.type === 'files.unavailable') return [event]
  if (event.type === 'files.snapshot') {
    const { tree } = event
    const maximumParts = Math.max(1, tree.entries.length)
    const make = (
      entries: typeof tree.entries,
      partNumber: number,
      partCount: number,
    ) => ({
      type: event.type,
      tree: { ...tree, entries, partNumber, partCount },
    })
    const parts = groups(tree.entries, Infinity, () =>
      jsonBytes(make([], maximumParts, maximumParts)),
    )
    return (
      parts?.map((entries, index) => make(entries, index + 1, parts.length)) ??
      null
    )
  }
  if (event.type === 'changes.updated') {
    const { changes } = event
    const maximumParts = Math.max(1, changes.files.length)
    const make = (
      files: typeof changes.files,
      partNumber: number,
      partCount: number,
    ) => ({
      type: event.type,
      changes: { ...changes, files, partNumber, partCount },
    })
    const parts = groups(changes.files, Infinity, () =>
      jsonBytes(make([], maximumParts, maximumParts)),
    )
    return (
      parts?.map((files, index) => make(files, index + 1, parts.length)) ?? null
    )
  }
  const { delta } = event
  const make = (changes: typeof delta.changes, index: number) => ({
    type: event.type,
    delta: { revision: delta.revision + index, changes },
  })
  const parts = groups(delta.changes, FILE_TREE_DELTA_MAX_CHANGES, (index) =>
    jsonBytes(make([], index)),
  )
  return parts?.map(make) ?? null
}
