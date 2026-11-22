import type { RepositoryKey } from '../../fixtures/repositories'
import type { WorkspaceRow } from './sections'

/**
 * The part of a member stack that an entry is: its first layer, a middle
 * one, or its last. A member stack moves through the queue as one unit, so
 * its rows stay together (decision 315).
 */
export type QueueUnit = 'first' | 'middle' | 'last'

/** One entry of a queue in the Merge queue group. */
export type QueueEntry = {
  row: WorkspaceRow
  /** The number of its pull request. */
  pullRequest: number
  /** Its step in words, or why it needs attention, under its name. */
  step: string
  unit?: QueueUnit
}

/**
 * The queue of one repository, headed by its name: the layers of its
 * stack, from place 1, which merges first, then the entries that left the
 * stack and wait for a member.
 */
export type QueueBlock = {
  repository: RepositoryKey
  name: string
  entries: readonly QueueEntry[]
  attention: readonly QueueEntry[]
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
 * repository. `zone`: a drag between two sections, while the group waits
 * as a drop zone, also when no queue has entries.
 */
export type QueueDrag =
  | { kind: 'reorder'; workspace: string; index: number }
  | { kind: 'add'; workspace: string }
  | { kind: 'zone' }

/**
 * The drop that the group draws, with the lifted row of a section when one
 * is over the group.
 */
export type GroupDrop =
  | { kind: 'reorder'; workspace: string; index: number }
  | { kind: 'add'; row: WorkspaceRow }
  | { kind: 'zone' }

/** The entries of every block, the layers first. */
export function queueEntries(queue: MergeQueueList): QueueEntry[] {
  return queue.blocks.flatMap((block) => [...block.entries, ...block.attention])
}

/** The count of the entries of the group, which its collapsed header shows. */
export function queueCount(queue: MergeQueueList): number {
  return queueEntries(queue).length
}

/**
 * The entries of a block in groups that move as one: a member stack, or
 * one entry alone. Each entry keeps its place, from 1.
 */
export function queueUnits(
  entries: readonly QueueEntry[],
): { place: number; entries: QueueEntry[] }[] {
  const units: { place: number; entries: QueueEntry[] }[] = []
  entries.forEach((entry, index) => {
    const open = units.at(-1)
    const joins =
      open !== undefined &&
      open.entries[0]?.unit === 'first' &&
      open.entries.at(-1)?.unit !== 'last' &&
      (entry.unit === 'middle' || entry.unit === 'last')
    if (joins) open.entries.push(entry)
    else units.push({ place: index + 1, entries: [entry] })
  })
  return units
}
