import type { BrowserChangesResponse } from '../../shared/generated/BrowserChangesResponse'
import type { ChangesDelta } from '../../shared/generated/ChangesDelta'
import type { FileTreeDelta } from '../../shared/generated/FileTreeDelta'
import type { FileTreeResponse } from '../../shared/generated/FileTreeResponse'
import type { FilesError } from '../api/files-errors'
import type { ParsedFileEvent } from '../api/parse-events'
import { applyChangesDelta, listedPaths } from './changes-model'
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
  changes: ListState<BrowserChangesResponse>
  /** The changes list must be read again after an update it could not apply. */
  changesStale: boolean
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
  changes: { value: null, floor: -1, error: null },
  changesStale: false,
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

/** Merges a list read, or returns null when its cutoff is obsolete. */
export function syncRead(
  sync: FilesSync,
  { list, result }: FileListRead,
): SyncStep | null {
  const cutoff = result.stateRead?.eventNumber
  const { floor, value } = sync[list]
  const repairing = list === 'tree' ? sync.treeStale : sync.changesStale
  if (
    cutoff !== undefined &&
    (cutoff < floor || (cutoff === floor && !repairing))
  )
    return null
  if (result.ok) {
    if (cutoff === undefined && value && !repairing) return unchanged(sync)
    const next =
      list === 'tree'
        ? fetchedTree(sync, result.value, cutoff)
        : {
            ...sync,
            changes: {
              value: result.value,
              floor: cutoff ?? floor,
              error: null,
            },
            changesStale: false,
          }
    return cutoff !== undefined || repairing
      ? unknownPaths(next)
      : unchanged(next)
  }
  if (cutoff === undefined) {
    return unchanged({
      ...sync,
      [list]: { ...sync[list], error: result.error },
    })
  }
  return unknownPaths({
    ...sync,
    [list]: { value: null, floor: cutoff, error: result.error },
    ...(list === 'tree'
      ? {
          treeUnavailable: false,
          treeStale: false,
          pending: sync.pending.filter((update) => update.eventNumber > cutoff),
        }
      : { changesStale: false }),
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

function syncChangesDelta(
  sync: FilesSync,
  delta: ChangesDelta | null,
  eventNumber: number,
): SyncStep {
  const before = sync.changes.value
  const next =
    delta && before && !sync.changesStale
      ? applyChangesDelta(before, delta)
      : null
  if (!next) {
    return unchanged({
      ...sync,
      changes: { ...sync.changes, floor: eventNumber },
      changesStale: true,
    })
  }
  return {
    sync: {
      ...sync,
      changes: { value: next.changes, floor: eventNumber, error: null },
    },
    touched: next.touched,
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
          changes: { value: event.changes, floor: eventNumber, error: null },
          changesStale: false,
        },
        touched: sync.changes.value
          ? listedPaths(sync.changes.value, event.changes)
          : none,
        allTouched: sync.changes.value === null,
      }
    case 'changes.changed':
      return syncChangesDelta(sync, event.delta, eventNumber)
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
    ...(changes
      ? {
          changes: { value: null, floor: eventNumber, error: null },
          changesStale: false,
        }
      : {}),
  })
}
