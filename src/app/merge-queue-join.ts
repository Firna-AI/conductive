import type { Workspace } from '../shared/generated/Workspace'
import {
  defaultQueueBranchLabel,
  type JoinRefusal,
} from '../ui/components/workspace/queueCopy'
import type { QueueFacts, QueueMenuAction } from './merge-queue'

/*
 * Who may change the merge queue, as the list knows it: the rule that
 * shows Add to merge queue in the menus, the palette, and the bar, the
 * reason that the drop target names, and Remove from queue (decisions 317
 * and 320). `docs/protocol/merge-queue.md` gives the rules of who may join.
 */

/** A pull request that is open on GitHub, also a draft. */
function hasOpenPull(workspace: Workspace): boolean {
  return (
    workspace.githubPullBase !== undefined ||
    (workspace.github !== null && workspace.github !== 'merged')
  )
}

/**
 * Whether a workspace that is not queued can join the queue of its
 * repository, as the list knows it. `unknown`: the list lacks a fact, such
 * as the access of the viewer or the default branch. The Worker then
 * decides, and a refusal names its reason.
 */
export type JoinCheck =
  | { kind: 'can-join' }
  | { kind: 'refused'; refusal: JoinRefusal }
  | { kind: 'unknown' }

const refused = (refusal: JoinRefusal): JoinCheck => ({
  kind: 'refused',
  refusal,
})

/**
 * Whether the unit of a pull request targets the default branch: its own
 * base, or the base of the lowest pull request of its member stack. A
 * lower pull request that is queued already holds a unit of the queue, so
 * an upper one joins on top of it (decision 315).
 */
function unitBase(
  workspace: Workspace,
  workspaces: readonly Workspace[],
  trunk: string,
): JoinCheck {
  const seen = new Set([workspace.id])
  let layer = workspace
  while (layer.githubPullBase !== undefined) {
    if (layer.githubPullBase === trunk) return { kind: 'can-join' }
    const branch = layer.githubPullBase
    const lower = workspaces.find(
      (item) =>
        item.repositoryId === workspace.repositoryId &&
        item.state !== 'archived' &&
        item.branch === branch &&
        (hasOpenPull(item) || item.githubPullFromFork === true) &&
        !seen.has(item.id),
    )
    if (!lower)
      return refused({
        kind: 'other-branch',
        base: layer.mergeQueueLabels?.pullBase ?? { text: 'another branch' },
        trunk:
          workspace.mergeQueueLabels?.defaultBranch ?? defaultQueueBranchLabel,
      })
    if (lower.githubPullFromFork) return refused({ kind: 'fork' })
    if (lower.mergeQueue !== undefined) return { kind: 'can-join' }
    seen.add(lower.id)
    layer = lower
  }
  return { kind: 'unknown' }
}

/**
 * Whether a live workspace that is not queued can join (decision 320): an
 * open pull request, write access of the viewer, and a unit that targets
 * the default branch.
 */
export function joinCheck(workspace: Workspace, facts: QueueFacts): JoinCheck {
  if (workspace.githubPullFromFork) return refused({ kind: 'fork' })
  if (!hasOpenPull(workspace)) return refused({ kind: 'no-pull-request' })
  const repository = facts.repositories.find(
    (item) => item.id === workspace.repositoryId,
  )
  if (workspace.githubCanWrite === false) {
    const name = repository?.fullName ?? 'this repository'
    return refused({ kind: 'write-access', repository: name })
  }
  if (repository?.githubQueueRequired)
    return refused({
      kind: 'github-merge-queue',
      trunk:
        workspace.mergeQueueLabels?.defaultBranch ?? defaultQueueBranchLabel,
    })
  if (repository?.queueInUse) return refused({ kind: 'other-org' })
  if (workspace.githubCanWrite === undefined || !repository) {
    return { kind: 'unknown' }
  }
  return unitBase(workspace, facts.workspaces, repository.defaultBranch)
}

/**
 * Whether the viewer may take an entry out of the queue: write access, as
 * for Merge (decision 221). A layer that merges cannot leave.
 */
export function mayRemove(workspace: Workspace): boolean {
  return (
    workspace.githubCanWrite === true &&
    workspace.mergeQueue !== undefined &&
    workspace.mergeQueue.state !== 'merging'
  )
}

/**
 * The merge queue item of the menu of a workspace: Add to merge queue for
 * one that can join, Remove from queue for an entry, or none. An archived
 * workspace offers none.
 */
export function queueMenuAction(
  workspace: Workspace,
  facts: QueueFacts,
): QueueMenuAction | undefined {
  if (workspace.state === 'archived') return undefined
  if (workspace.mergeQueue !== undefined) {
    return mayRemove(workspace) ? 'remove' : undefined
  }
  return joinCheck(workspace, facts).kind === 'can-join' ? 'add' : undefined
}
