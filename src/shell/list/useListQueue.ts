import type { Workspace } from '../../shared/generated/Workspace'
import { useToast } from '@firna/ui/toast'
import { joinRefusalText } from '../../ui/components/workspace/queueCopy'
import { errorMessage } from '../../app/api/client'
import { queueBlocks, type QueueFacts } from '../../app/merge-queue'
import {
  addToMergeQueue,
  moveInMergeQueue,
  removeFromMergeQueue,
} from '../../app/merge-queue-actions'
import { joinCheck } from '../../app/merge-queue-join'
import type { OrgModel } from '../../app/org-model'
import { useStore, valueOf } from '../../app/store'
import type { QueueList } from './useQueueGroup'
import type { RowQueue } from './useRowMenus'

/**
 * The merge queue of the list of an org: the blocks of the Merge queue
 * group, the reason that its drop target names for a row that cannot
 * join, and the writes of the queue, each with a toast that names a
 * failure. A write shows at once, and the list goes back when it fails.
 * The workspace list gives the repository names, order, and default branches.
 */
export function useListQueue(
  org: OrgModel,
  workspaces: readonly Workspace[],
  queued: readonly Workspace[],
): {
  list: QueueList
  rows: RowQueue
  facts: QueueFacts
  /** Each write says whether it worked, after its toast of a failure. */
  add: (workspaceId: string) => Promise<boolean>
  remove: (workspaceId: string) => Promise<boolean>
} {
  const { toast } = useToast()
  const repositories = valueOf(useStore(org.listRepositories)) ?? []
  const facts: QueueFacts = { workspaces, repositories }
  const run = (write: Promise<void>, title: string) =>
    write.then(
      () => true,
      (error: unknown) => {
        toast({ title, description: errorMessage(error), tone: 'error' })
        return false
      },
    )
  const add = (workspaceId: string) =>
    run(
      addToMergeQueue(org, workspaceId),
      "The workspace wasn't added to the merge queue.",
    )
  const remove = (workspaceId: string) =>
    run(
      removeFromMergeQueue(org, workspaceId),
      "The workspace wasn't removed from the merge queue.",
    )
  const move = (workspaceId: string, beforeWorkspaceId: string | null) =>
    void run(
      moveInMergeQueue(org, workspaceId, beforeWorkspaceId),
      "The merge queue didn't change.",
    )
  const list: QueueList = {
    blocks: queueBlocks(queued, repositories),
    refusal: (workspace) => {
      const check = joinCheck(workspace, facts)
      return check.kind === 'refused' ? joinRefusalText(check.refusal) : null
    },
    mayMove: (workspace) => workspace.githubCanWrite === true,
    add: (workspace) => void add(workspace.id),
    move,
  }
  return { list, rows: { facts, add, remove }, facts, add, remove }
}
