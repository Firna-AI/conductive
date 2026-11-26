import type { Workspace } from '../shared/generated/Workspace'
import type { WorkspaceListRepository } from '../shared/generated/WorkspaceListRepository'

/*
 * The merge queue as the workspace list reads it: one queue for each
 * repository of the org, into its default branch (decision 320). The list
 * read carries the entry of each queued workspace, the access of the
 * viewer to each repository, and the GitHub base of each open pull
 * request. `docs/protocol/merge-queue-in-the-app.md` gives the rules.
 */

/** The facts of a chosen repository that the queue reads, in the org order. */
export type QueueRepository = Omit<WorkspaceListRepository, 'selected'>

/** The queue of one repository: its entries from place 1, the next to merge. */
export interface QueueBlock {
  repositoryId: string
  /** The full name of the repository, or null while the list lacks it. */
  name: string | null
  entries: readonly Workspace[]
}

/** The merge queue action of a workspace menu, as the mockups name it. */
export type QueueMenuAction = 'add' | 'remove'

/** What the list knows of the queues: its workspaces and repositories. */
export interface QueueFacts {
  workspaces: readonly Workspace[]
  repositories: readonly QueueRepository[]
}

const placeOf = (workspace: Workspace) => workspace.mergeQueue?.place ?? 0

/** Place 1 first. */
export function byPlace(a: Workspace, b: Workspace): number {
  return placeOf(a) - placeOf(b) || a.id.localeCompare(b.id)
}

/** A live workspace in the merge queue. */
export function isQueued(workspace: Workspace): boolean {
  return workspace.state !== 'archived' && workspace.mergeQueue !== undefined
}

/**
 * The blocks of the Merge queue group: one for each repository whose queue
 * has entries, in the order of the repositories of the org, each with its
 * entries from place 1. A repository that the list lacks comes last.
 */
export function queueBlocks(
  queued: readonly Workspace[],
  repositories: readonly QueueRepository[],
): QueueBlock[] {
  const byRepository = new Map<string, Workspace[]>()
  for (const workspace of queued) {
    const entries = byRepository.get(workspace.repositoryId) ?? []
    entries.push(workspace)
    byRepository.set(workspace.repositoryId, entries)
  }
  const order = (id: string) => {
    const at = repositories.findIndex((repository) => repository.id === id)
    return at < 0 ? repositories.length : at
  }
  return [...byRepository]
    .sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b))
    .map(([repositoryId, entries]) => ({
      repositoryId,
      name:
        repositories.find((repository) => repository.id === repositoryId)
          ?.fullName ?? null,
      entries: entries.toSorted(byPlace),
    }))
}

/**
 * The entries of a block in the groups that move as one, in their order:
 * a member stack, or one entry alone (decision 315).
 */
export function queueUnits(entries: readonly Workspace[]): Workspace[][] {
  const units: Workspace[][] = []
  for (const entry of entries) {
    const last = units.at(-1)
    const unitId = entry.mergeQueue?.unitId
    if (last && unitId !== undefined && last[0].mergeQueue?.unitId === unitId)
      last.push(entry)
    else units.push([entry])
  }
  return units
}

/** The entries above a workspace in its unit, which leave the queue with it. */
export function unitAbove(
  entries: readonly Workspace[],
  workspaceId: string,
): Workspace[] {
  const unit = queueUnits(entries).find((item) =>
    item.some((entry) => entry.id === workspaceId),
  )
  if (!unit) return []
  return unit.slice(unit.findIndex((entry) => entry.id === workspaceId) + 1)
}

/**
 * The unit of an entry, its index among the units of its block, and the
 * other units, or null for a workspace that the block lacks.
 */
function unitPlace(
  entries: readonly Workspace[],
  workspaceId: string,
): { unit: Workspace[]; at: number; rest: Workspace[][] } | null {
  const units = queueUnits(entries)
  const at = units.findIndex((item) =>
    item.some(({ id }) => id === workspaceId),
  )
  if (at < 0) return null
  return { unit: units[at], at, rest: units.toSpliced(at, 1) }
}

/**
 * The workspace whose unit a moved unit goes before, at `index` among the
 * other units of its block, or null for the end, as the re-order route
 * takes it.
 */
export function unitBefore(
  entries: readonly Workspace[],
  workspaceId: string,
  index: number,
): string | null {
  return unitPlace(entries, workspaceId)?.rest[index]?.[0].id ?? null
}

/**
 * The move one step up or down of the unit of an entry, for the keys that
 * move a focused row: before the unit above it, or after the unit below
 * it. Null at the end of its block, because an entry moves only inside
 * its block. `place` is the new place of the entry.
 */
export function queueStep(
  entries: readonly Workspace[],
  workspaceId: string,
  step: 1 | -1,
): { before: string | null; place: number } | null {
  const found = unitPlace(entries, workspaceId)
  if (!found) return null
  const { unit, at, rest } = found
  const index = at + step
  if (index < 0 || index > rest.length) return null
  const own = unit.findIndex(({ id }) => id === workspaceId)
  return {
    before: rest[index]?.[0].id ?? null,
    place: rest.slice(0, index).flat().length + own + 1,
  }
}
