import type { MergeQueueEntry } from '../../src/shared/generated/MergeQueueEntry'
import type { MergeQueueWait } from '../../src/shared/generated/MergeQueueWait'
import type { ReorderMergeQueue } from '../../src/shared/generated/ReorderMergeQueue'
import type { GitHubWorkspace } from '../github/contracts'

export interface QueueScope {
  orgId: string
  githubRepositoryId: number
}

export interface QueueRecord extends QueueScope {
  id: string
  repositoryId: string
  trunk: string
  githubStackNumber: number | null
  defaultBranch: string
  pendingWrite: string | null
  suspendedAt: number | null
}

export interface QueueEntry extends MergeQueueEntry {
  workspaceId: string
  branch: string
  pullNumber: number
  queuerUserId: string
  wait: MergeQueueWait | null
  stepAt: number
}

export type QueueCandidate = Pick<
  QueueEntry,
  'workspaceId' | 'branch' | 'pullNumber'
>

export type QueueMemberAction =
  | { kind: 'add' }
  | { kind: 'remove' }
  | ({ kind: 'reorder' } & ReorderMergeQueue)

export interface QueueWriter {
  workspace: GitHubWorkspace
  memberId: string
}

export type QueueLeave =
  | { cause: 'org-suspended' | 'default-branch-switched' }
  | {
      cause:
        | 'merged'
        | 'closed'
        | 'draft'
        | 'archived'
        | 'repository-changed'
        | 'branch-changed'
        | 'continued'
        | 'removed'
        | 'base-changed'
        | 'queuer-left'
        | 'write-access-lost'
      workspaceId: string
      branch: string
      pullNumber?: number
    }

export function queueId(scope: QueueScope): string {
  return `merge-queue:${scope.orgId}:${scope.githubRepositoryId}`
}
