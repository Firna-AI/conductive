import type { Membership } from '../../fixtures/members'
import { mayArchiveWorkspace } from './permissions'
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
 * over the group, with that row and the reason when it cannot join, or the
 * move of an entry in its block. While no queue has entries, the list shows
 * no group, so a drag gives no drop.
 */
export function groupDropOf(
  props: ListQueue & { sections: readonly SidebarSection[] },
): GroupDrop | undefined {
  const drag = props.queueDrag
  if (!drag || !props.queue || props.queue.blocks.length === 0) {
    return undefined
  }
  if (drag.kind === 'reorder') return drag
  const found = props.sections
    .flatMap((item) => item.rows)
    .find((item) => item.workspace.key === drag.workspace)
  if (!found) return undefined
  const row = { ...found, selected: false }
  return drag.kind === 'add'
    ? { kind: 'add', row }
    : { kind: 'refused', row, reason: drag.reason }
}

/**
 * The entries of the group whose rows offer Archive on hover, as a row of
 * a section does: for an admin and for the owner, in an org that is not
 * read-only.
 */
export function archivableEntries(
  queue: MergeQueueList,
  viewer: Membership,
  readOnly: boolean,
): string[] {
  if (readOnly) return []
  return queueEntries(queue)
    .filter((entry) => mayArchiveWorkspace(viewer, entry.row.workspace.owner))
    .map((entry) => entry.row.workspace.key)
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
