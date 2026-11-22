import {
  queueEntries,
  type GroupDrop,
  type MergeQueueList,
  type QueueDrag,
} from './queue'
import type { QueueMenuAction } from './rowControls'
import type { SidebarSection } from './sections'

/**
 * The props of a list that draw the merge queue: the Merge queue group at
 * the top, a drag that the group draws, and the rows of the sections whose
 * menus offer Add to merge queue, because their pull requests can join and
 * the viewer has write access. A list without them shows no part of the
 * queue.
 */
export type ListQueue = {
  queue?: MergeQueueList
  queueDrag?: QueueDrag
  queueable?: readonly string[]
}

/**
 * The drop that the group draws for the drag of a list: a row of a section
 * over the group, with that row, the move of an entry in its block, or the
 * zone during a drag between sections.
 */
export function groupDropOf(
  props: ListQueue & { sections: readonly SidebarSection[] },
): GroupDrop | undefined {
  const drag = props.queueDrag
  if (!drag || !props.queue) return undefined
  if (drag.kind !== 'add') return drag
  const row = props.sections
    .flatMap((item) => item.rows)
    .find((item) => item.workspace.key === drag.workspace)
  return row ? { kind: 'add', row: { ...row, selected: false } } : undefined
}

/**
 * The item of the merge queue in the menu of each row: Add to merge queue
 * on a row of a section that can join, and Remove from queue on each entry
 * of the group.
 */
export function queueActionsOf(
  props: ListQueue,
): ReadonlyMap<string, QueueMenuAction> | undefined {
  if (!props.queue && !props.queueable) return undefined
  const queued = props.queue ? queueEntries(props.queue) : []
  return new Map<string, QueueMenuAction>([
    ...(props.queueable ?? []).map((key) => [key, 'add'] as const),
    ...queued.map((entry) => [entry.row.workspace.key, 'remove'] as const),
  ])
}
