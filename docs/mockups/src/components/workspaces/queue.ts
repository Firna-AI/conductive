import type { RepositoryKey } from '../../fixtures/repositories'
import type { WorkspaceRow } from './sections'

/**
 * The part of a member stack that an entry is: its first layer, a middle
 * one, or its last. A member stack moves through the queue as one unit, so
 * its rows stay together (decision 315).
 */
export type QueueUnit = 'first' | 'middle' | 'last'

/**
 * One entry of a queue in the Merge queue group: the normal row of its
 * workspace, and its part of a member stack.
 */
export type QueueEntry = {
  row: WorkspaceRow
  unit?: QueueUnit
}

/**
 * The queue of one repository: the layers of its stack, from place 1,
 * which merges first. An entry that cannot merge keeps its place among
 * them.
 */
export type QueueBlock = {
  repository: RepositoryKey
  name: string
  entries: readonly QueueEntry[]
}

/**
 * The Merge queue group at the top of the list: one block for each queue
 * with entries. `collapsed`: the group shows only its header and its count.
 */
export type MergeQueueList = {
  blocks: readonly QueueBlock[]
  collapsed?: boolean
}

/**
 * A drag that the group draws. `reorder`: an entry, or the member stack
 * that it starts, lifted to another place of its block, before the entry
 * at `index`, which counts the units without the lifted one. `add`: a row
 * of a section over the group, which joins at the end of the block of its
 * repository. `refused`: a row of a section that cannot join, over the
 * group, which names the reason in words and takes no drop. `zone`: a
 * drag between two sections, while the group waits as a drop zone, also
 * when no queue has entries.
 */
export type QueueDrag =
  | { kind: 'reorder'; workspace: string; index: number }
  | { kind: 'add'; workspace: string }
  | { kind: 'refused'; workspace: string; reason: string }
  | { kind: 'zone' }

/**
 * The drop that the group draws, with the lifted row of a section when one
 * is over the group.
 */
export type GroupDrop =
  | { kind: 'reorder'; workspace: string; index: number }
  | { kind: 'add'; row: WorkspaceRow }
  | { kind: 'refused'; row: WorkspaceRow; reason: string }
  | { kind: 'zone' }

/** The entries of every block, in the order of the blocks. */
export function queueEntries(queue: MergeQueueList): QueueEntry[] {
  return queue.blocks.flatMap((block) => block.entries)
}

/** The count of the entries of the group, which its collapsed header shows. */
export function queueCount(queue: MergeQueueList): number {
  return queueEntries(queue).length
}

/**
 * The entries of a block in groups that move as one: a member stack, or
 * one entry alone, in the order of their places.
 */
export function queueUnits(entries: readonly QueueEntry[]): QueueEntry[][] {
  const units: QueueEntry[][] = []
  for (const entry of entries) {
    const open = units.at(-1)
    const joins =
      open !== undefined &&
      open[0]?.unit === 'first' &&
      open.at(-1)?.unit !== 'last' &&
      (entry.unit === 'middle' || entry.unit === 'last')
    if (joins) open.push(entry)
    else units.push([entry])
  }
  return units
}
