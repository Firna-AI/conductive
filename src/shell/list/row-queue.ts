import type { Workspace } from '../../shared/generated/Workspace'
import { ListPlus, ListX, type LucideIcon } from 'lucide-react'
import {
  queueLabels,
  type LeavingLayer,
} from '../../../docs/mockups/src/components/workspace/queueCopy'
import type { WorkspaceMenuItem } from '../../../docs/mockups/src/components/workspaces/workspaceMenu'
import {
  byPlace,
  isQueued,
  unitAbove,
  type QueueFacts,
  type QueueMenuAction,
} from '../../app/merge-queue'
import { nameLabel } from '../../shared/name-label'

/** An item of the menu of a row: an action of the workspace, or of the queue. */
export type RowMenuItem =
  | WorkspaceMenuItem
  | { kind: 'queue'; action: QueueMenuAction; label: string; icon: LucideIcon }

/**
 * The menu with the item of the merge queue in the group of Archive, after
 * the line, or after a new line when the person may not archive, as
 * `withQueueItem` of the mockups places it (decision 317).
 */
export function withQueueItem(
  items: readonly WorkspaceMenuItem[],
  action: QueueMenuAction | undefined,
): RowMenuItem[] {
  if (!action) return [...items]
  const item: RowMenuItem =
    action === 'add'
      ? { kind: 'queue', action, label: queueLabels.add, icon: ListPlus }
      : { kind: 'queue', action, label: queueLabels.remove, icon: ListX }
  const line = items.findIndex((entry) => entry.kind === 'divider')
  if (line < 0) return [...items, { kind: 'divider' }, item]
  return [...items.slice(0, line + 1), item, ...items.slice(line + 1)]
}

/**
 * The facts that the question before Remove from queue names: the number
 * of the pull request, when the screen knows it, the branch that it
 * targets again, and the entries above it in its member stack, which leave
 * with it (decision 315).
 */
export interface RemoveQuestion {
  workspaceId: string
  number?: number
  trunk: string
  above: readonly LeavingLayer[]
}

/**
 * The question of Remove from queue for an entry, from the list. `known`
 * gives what the screen of the workspace knows: the number of its pull
 * request, and the trunk of its queue. Without them, the question names the
 * default branch of the repository, or "the default branch".
 */
export function removeQuestionOf(
  workspace: Workspace,
  facts: QueueFacts,
  known: { number?: number; trunk?: string } = {},
): RemoveQuestion {
  const entries = facts.workspaces
    .filter(
      (item) => item.repositoryId === workspace.repositoryId && isQueued(item),
    )
    .sort(byPlace)
  const repository = facts.repositories.find(
    (item) => item.id === workspace.repositoryId,
  )
  const number = known.number ?? workspace.mergeQueue?.pullNumber
  return {
    workspaceId: workspace.id,
    ...(number !== undefined && { number }),
    trunk: known.trunk ?? repository?.defaultBranch ?? 'the default branch',
    above: unitAbove(entries, workspace.id).map((item) => ({
      name: nameLabel(item.name),
      ...(item.mergeQueue?.pullNumber !== undefined && {
        number: item.mergeQueue.pullNumber,
      }),
    })),
  }
}
