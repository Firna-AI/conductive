import type { QueueEntry, QueueLeave } from './contracts'
import { queueMerging, queueMissing } from './errors'

export function leaveOrder(entries: QueueEntry[], signal: QueueLeave) {
  if (!('workspaceId' in signal)) return { remaining: [], removed: entries }
  const target = entries.find(
    (entry) =>
      entry.workspaceId === signal.workspaceId &&
      entry.branch === signal.branch &&
      (signal.pullNumber === undefined ||
        entry.pullNumber === signal.pullNumber),
  )
  if (!target) return { remaining: entries, removed: [] }
  const removed =
    signal.cause === 'merged'
      ? [target]
      : entries.filter(
          (entry) =>
            entry.unitId === target.unitId && entry.place >= target.place,
        )
  if (
    signal.cause === 'removed' &&
    removed.some((entry) => entry.state === 'merging')
  )
    throw queueMerging()
  return {
    remaining: entries.filter((entry) => !removed.includes(entry)),
    removed,
  }
}

export function moveUnit(
  entries: QueueEntry[],
  target: QueueEntry,
  beforeWorkspaceId: string | null,
): QueueEntry[] {
  const before =
    beforeWorkspaceId === null
      ? undefined
      : entries.find((entry) => entry.workspaceId === beforeWorkspaceId)
  if (beforeWorkspaceId !== null && !before) throw queueMissing()
  if (before?.unitId === target.unitId) return entries
  const unit = entries.filter((entry) => entry.unitId === target.unitId)
  const remaining = entries.filter((entry) => entry.unitId !== target.unitId)
  const at = before
    ? remaining.findIndex((entry) => entry.unitId === before.unitId)
    : remaining.length
  const ordered = [...remaining.slice(0, at), ...unit, ...remaining.slice(at)]
  if (ordered.every((entry, index) => entry === entries[index])) return entries
  const crossesMerge = remaining
    .slice(at)
    .some((entry) => entry.state === 'merging' && entry.place < unit[0].place)
  if (crossesMerge || unit.some((entry) => entry.state === 'merging'))
    throw queueMerging()
  return ordered
}
