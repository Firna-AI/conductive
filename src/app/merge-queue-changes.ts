import type { MergeQueueEntry } from '../shared/generated/MergeQueueEntry'
import type { Workspace } from '../shared/generated/Workspace'
import type { ListChange } from './list-changes'
import { byPlace, isQueued, queueUnits, unitAbove } from './merge-queue'

/*
 * The changes of the list that the writes of the merge queue show at once,
 * before the Worker answers. Each one applies to the list as it is then. A
 * read of the list after the answer gives the places that the Worker
 * wrote, such as for the lower pull requests of a member stack.
 */

/** The live entries of the queue of a repository, from place 1. */
function entriesOf(
  workspaces: readonly Workspace[],
  repositoryId: string,
): Workspace[] {
  return workspaces
    .filter((item) => item.repositoryId === repositoryId && isQueued(item))
    .sort(byPlace)
}

/** The list with the entries of one queue in `order`, placed from 1. */
function withOrder(
  workspaces: readonly Workspace[],
  order: readonly Workspace[],
): Workspace[] {
  const places = new Map(order.map((item, index) => [item.id, index + 1]))
  return workspaces.map((item) => {
    const place = places.get(item.id)
    if (place === undefined || !item.mergeQueue) return item
    return { ...item, mergeQueue: { ...item.mergeQueue, place } }
  })
}

function withoutEntry(workspace: Workspace): Workspace {
  const copy = { ...workspace }
  delete copy.mergeQueue
  return copy
}

/**
 * Add to merge queue: the workspace joins at the end of the queue of its
 * repository, at the top of the stack, as a unit of its own until the read.
 */
export function queueJoined(workspaceId: string): ListChange {
  return (list) => {
    const workspace = list.workspaces.find((item) => item.id === workspaceId)
    if (!workspace || workspace.state === 'archived' || workspace.mergeQueue)
      return list
    const entries = entriesOf(list.workspaces, workspace.repositoryId)
    const mergeQueue: MergeQueueEntry = {
      queueId:
        entries[0]?.mergeQueue?.queueId ?? `pending-${workspace.repositoryId}`,
      place: entries.length + 1,
      unitId: `pending-${workspace.id}`,
      state: 'queued',
    }
    return {
      ...list,
      workspaces: list.workspaces.map((item) =>
        item.id === workspaceId ? { ...item, mergeQueue } : item,
      ),
    }
  }
}

/**
 * Remove from queue: the entry leaves with the entries above it in its
 * unit (decision 315), and the entries after them move up.
 */
export function queueLeft(workspaceId: string): ListChange {
  return (list) => {
    const workspace = list.workspaces.find((item) => item.id === workspaceId)
    if (!workspace?.mergeQueue) return list
    const entries = entriesOf(list.workspaces, workspace.repositoryId)
    const above = unitAbove(entries, workspaceId).map((item) => item.id)
    const leaving = new Set([workspaceId, ...above])
    const workspaces = list.workspaces.map((item) =>
      leaving.has(item.id) ? withoutEntry(item) : item,
    )
    const kept = entries.filter((item) => !leaving.has(item.id))
    return { ...list, workspaces: withOrder(workspaces, kept) }
  }
}

/**
 * A re-order: the unit of the workspace moves before the unit of
 * `beforeWorkspaceId`, or to the end of its queue with null. A unit never
 * splits, and an entry never leaves its queue.
 */
export function queueMoved(
  workspaceId: string,
  beforeWorkspaceId: string | null,
): ListChange {
  return (list) => {
    const workspace = list.workspaces.find((item) => item.id === workspaceId)
    if (!workspace?.mergeQueue) return list
    const units = queueUnits(entriesOf(list.workspaces, workspace.repositoryId))
    const has = (id: string | null) => (unit: readonly Workspace[]) =>
      unit.some((item) => item.id === id)
    const moved = units.find(has(workspaceId))
    if (!moved) return list
    const rest = units.filter((unit) => unit !== moved)
    const at =
      beforeWorkspaceId === null
        ? rest.length
        : rest.findIndex(has(beforeWorkspaceId))
    if (at < 0) return list
    const order = [...rest.slice(0, at), moved, ...rest.slice(at)].flat()
    return { ...list, workspaces: withOrder(list.workspaces, order) }
  }
}
