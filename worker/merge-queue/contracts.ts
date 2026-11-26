import type { MergeQueueEntry } from '../../src/shared/generated/MergeQueueEntry'
import type { MergeQueueWait } from '../../src/shared/generated/MergeQueueWait'
import type { ReorderMergeQueue } from '../../src/shared/generated/ReorderMergeQueue'
import type { RequestQueueStackMerge } from '../../src/shared/generated/RequestQueueStackMerge'
import type { GitHubWorkspace } from '../github/contracts'

export interface QueueScope {
  orgId: string
  githubRepositoryId: number
}

export interface QueueRecord extends QueueScope {
  id: string
  repositoryId: string
  fullName: string
  installationId: number
  trunk: string
  trunkPullNumber: number | null
  githubStackNumber: number | null
  stackWriterUserId: string | null
  stackCleanupWorkspaceId: string | null
  stackCleanupActorUserId: string | null
  rebuildStack: number
  reordering: number
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
  queuedAt: number
  stepAt: number
  memberBase?: string | null
  mergeHead?: string | null
  refusedHead?: string | null
  oldBase?: string | null
  oldBaseHead?: string | null
  githubBase?: string | null
  pendingBase?: string | null
  observedHead?: string | null
  syncFrom?: string | null
}

export type QueueCandidate = Pick<
  QueueEntry,
  | 'workspaceId'
  | 'branch'
  | 'pullNumber'
  | 'memberBase'
  | 'oldBase'
  | 'oldBaseHead'
  | 'githubBase'
>

export type QueueMemberAction =
  | { kind: 'add' }
  | { kind: 'remove' }
  | { kind: 'merge'; ahead: number }
  | ({ kind: 'merge-stack' } & RequestQueueStackMerge)
  | ({ kind: 'reorder' } & ReorderMergeQueue)

export type QueueMergeTarget = Pick<
  QueueEntry,
  'workspaceId' | 'branch' | 'pullNumber'
>

export interface QueueWriter {
  workspace: GitHubWorkspace
  memberId: string
}

export type QueueLeave = (
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
      baseBranch?: string
    }
) & { actorId?: string; memberStackMerge?: true }

export function queueId(scope: QueueScope): string {
  return `merge-queue:${scope.orgId}:${scope.githubRepositoryId}`
}
