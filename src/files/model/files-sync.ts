import type { FileTreeDelta } from '../../shared/generated/FileTreeDelta'
import type { FileTreeResponse } from '../../shared/generated/FileTreeResponse'
import type { FilesError } from '../api/files-errors'
import type { ParsedFileEvent } from '../api/parse-events'
import { listedPaths } from './changes-model'
import {
  mergeChangesRead,
  replaceChanges,
  syncChangesDelta,
  type ChangesSync,
} from './files-changes-sync'
import type { FileListRead } from './files-reads'
import { applyTreeDelta, treeFromSnapshot, type FileTree } from './tree-model'

interface ListState<T> {
  value: T | null
  /** The read cutoff or the newest event that the list must account for. */
  floor: number
  error: FilesError | null
}

interface TreeUpdate {
  eventNumber: number
  delta: FileTreeDelta
}

/** The tree and changes merged from the file routes and the event stream. */
export interface FilesSync {
  tree: ListState<FileTree>
  treeUnavailable: boolean
  /** Updates that wait for a tree, or for a tree read after a gap. */
  pending: readonly TreeUpdate[]
  /** An update skipped a revision, so the tree must be read again. */
  treeStale: boolean
  changes: ChangesSync
}

/** A merge result, with the paths whose content may have changed. */
export interface SyncStep {
  sync: FilesSync
  touched: ReadonlySet<string>
  /** The affected paths cannot be named, so any file may have changed. */
  allTouched: boolean
}

export const emptySync: FilesSync = {
  tree: { value: null, floor: -1, error: null },
  treeUnavailable: false,
  pending: [],
  treeStale: false,
  changes: replaceChanges(null, -1),
}

const none: ReadonlySet<string> = new Set()

function unchanged(sync: FilesSync): SyncStep {
  return { sync, touched: none, allTouched: false }
}

function unknownPaths(sync: FilesSync): SyncStep {
  return { sync, touched: none, allTouched: true }
}

function fetchedTree(
  sync: FilesSync,
  response: FileTreeResponse,
  cutoff: number | undefined,
): FilesSync {
  let value = treeFromSnapshot(response)
  let floor = cutoff ?? sync.tree.floor
  for (const { eventNumber, delta } of sync.pending) {
    if (cutoff !== undefined && eventNumber <= cutoff) continue
    if (delta.revision <= value.revision) continue
    value = applyTreeDelta(value, delta).tree
    floor = Math.max(floor, eventNumber)
  }
  const treeUnavailable =
    response.unavailable === true ||
    (cutoff === undefined && sync.treeUnavailable)
  return {
    ...sync,
    tree: { value, floor, error: null },
    treeUnavailable,
    pending: [],
    treeStale: false,
  }
}

/** Merges a list read, or returns null when a newer read is needed. */
export function syncRead(
  sync: FilesSync,
  { list, result }: FileListRead,
): SyncStep | null {
  const cutoff = result.stateRead?.eventNumber
  if (list === 'changes') {
    const changes = mergeChangesRead(sync.changes, result, cutoff)
    if (!changes) return null
    const next = { ...sync, changes }
    return cutoff !== undefined || (result.ok && sync.changes.stale)
      ? unknownPaths(next)
      : unchanged(next)
  }

  const { floor, value } = sync.tree
  const repairing = sync.treeStale
  if (
    cutoff !== undefined &&
    (cutoff < floor || (cutoff === floor && !repairing))
  )
    return null
  if (result.ok) {
    if (cutoff === undefined && value && !repairing) return unchanged(sync)
    const next = fetchedTree(sync, result.value, cutoff)
    return cutoff !== undefined || repairing
      ? unknownPaths(next)
      : unchanged(next)
  }
  if (cutoff === undefined) {
    return unchanged({
      ...sync,
      tree: { ...sync.tree, error: result.error },
    })
  }
  return unknownPaths({
    ...sync,
    tree: { value: null, floor: cutoff, error: result.error },
    treeUnavailable: false,
    treeStale: false,
    pending: sync.pending.filter((update) => update.eventNumber > cutoff),
  })
}

function syncDelta(sync: FilesSync, update: TreeUpdate): SyncStep {
  const tree = sync.tree.value
  const { delta, eventNumber } = update
  if (!tree || sync.treeStale) {
    return unknownPaths({ ...sync, pending: [...sync.pending, update] })
  }
  if (delta.revision <= tree.revision) return unknownPaths(sync)
  if (delta.revision > tree.revision + 1) {
    return unknownPaths({
      ...sync,
      pending: [...sync.pending, update],
      treeStale: true,
    })
  }
  const step = applyTreeDelta(tree, delta)
  return {
    sync: {
      ...sync,
      tree: { ...sync.tree, value: step.tree, floor: eventNumber },
    },
    touched: step.touched,
    allTouched: false,
  }
}

/** Applies one file event of the stream, in event order. */
export function syncEvent(
  sync: FilesSync,
  event: ParsedFileEvent,
  eventNumber: number,
): SyncStep {
  switch (event.type) {
    case 'files.snapshot':
      return {
        sync: {
          ...sync,
          tree: {
            value: treeFromSnapshot(event.tree),
            floor: eventNumber,
            error: null,
          },
          treeUnavailable: event.tree.unavailable === true,
          pending: [],
          treeStale: false,
        },
        touched: none,
        allTouched: true,
      }
    case 'files.changed':
      return syncDelta(sync, { eventNumber, delta: event.delta })
    case 'files.unavailable':
      // The saved tree stays, and no file content changes.
      return unchanged({
        ...sync,
        tree: { ...sync.tree, floor: eventNumber },
        treeUnavailable: true,
      })
    case 'changes.updated':
      return {
        sync: {
          ...sync,
          changes: replaceChanges(event.changes, eventNumber),
        },
        touched: sync.changes.value
          ? listedPaths(sync.changes.value, event.changes)
          : none,
        allTouched: sync.changes.value === null,
      }
    case 'changes.changed': {
      const next = syncChangesDelta(sync.changes, event.delta, eventNumber)
      return {
        sync: { ...sync, changes: next.state },
        touched: next.touched ?? none,
        allTouched: false,
      }
    }
  }
}

/**
 * The lists after a repository change moved the workspace to another
 * folder, as the workspace marks its stored lists: the tree stays with the
 * unavailable mark, so its revision still takes the updates that follow,
 * and the changes go. The next full tree of the stream clears the mark, and
 * the next changes report of the stream gives the new list. Any file may
 * have changed.
 */
export function syncMoved(
  sync: FilesSync,
  eventNumber: number,
  tree: boolean,
  changes: boolean,
): SyncStep {
  return unknownPaths({
    ...sync,
    ...(tree
      ? {
          tree: { ...sync.tree, floor: eventNumber },
          treeUnavailable: sync.tree.value !== null || sync.treeUnavailable,
        }
      : {}),
    ...(changes ? { changes: replaceChanges(null, eventNumber) } : {}),
  })
}
