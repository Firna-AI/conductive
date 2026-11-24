import type { MergeQueueWait } from '../../src/shared/generated/MergeQueueWait'
import { workspaceBinding } from '../app-api/workspace-state'
import type { GitHubReader } from '../github/client'
import { HttpError } from '../http'
import type { QueueEntry, QueueMergeTarget, QueueRecord } from './contracts'
import type { QueueLocalState } from './local-work'
import { queueReader, queueReadToken, queueWorkspace } from './repository'
import type { QueueRestackRead } from './restacks'
import {
  matchesStack,
  openStackLayers,
  readOtherStack,
  readQueueStack,
} from './stack-read'
import type { QueueRuntime } from './step'
import { rememberTrunkPull } from './step-data'

export type QueuePullSnapshot = Awaited<
  ReturnType<GitHubReader['queuedPull']>
> & {
  entry: QueueEntry
}

export interface QueuePullRead extends QueuePullSnapshot {
  /** Contiguous, checked membership in the GitHub stack used for this merge. */
  stackNumber: number | null
  standalone: boolean
  local: QueueLocalState
  restackWait?: MergeQueueWait
}

export async function readMergeLocalWork(
  runtime: QueueRuntime,
  queue: QueueRecord,
  entry: QueueMergeTarget,
  userId: string,
): Promise<QueueLocalState> {
  try {
    return await workspaceBinding(runtime.env)
      .getByName(entry.workspaceId)
      .mergeQueueLocalClean({
        orgId: queue.orgId,
        workspaceId: entry.workspaceId,
        repositoryId: queue.repositoryId,
        branch: entry.branch,
        userId,
      })
  } catch (error) {
    if (error instanceof HttpError || error instanceof Error)
      return 'unavailable'
    throw error
  }
}

export async function readMergePulls(
  runtime: QueueRuntime,
  queue: QueueRecord,
  entries: readonly QueueEntry[],
  clicker?: string,
  restack?: QueueRestackRead,
): Promise<QueuePullRead[]> {
  const bottom = entries[0]
  if (!bottom) return []
  const token =
    restack?.token ??
    (await queueReadToken(runtime, queueWorkspace(queue, bottom)))
  const fetch = runtime.dependencies.fetch
  const other =
    !restack && queue.githubStackNumber === null
      ? await readOtherStack(
          runtime.env.DB,
          queue,
          entries,
          bottom,
          fetch,
          token,
        )
      : null
  const stack = restack
    ? restack.stack
    : other?.kind === 'member'
      ? other.stack
      : await readQueueStack(queue, fetch, token)
  const open = stack ? openStackLayers(stack) : []
  const readyCount =
    restack?.readyCount ?? (other?.kind === 'member' ? other.count : Infinity)
  const standalone =
    queue.rebuildStack === 0 &&
    (entries.length === 1 || restack !== undefined) &&
    queue.trunk === queue.defaultBranch &&
    queue.githubStackNumber === null &&
    (restack ? stack === null : other?.kind === 'none')
  const reads: QueuePullRead[] = []
  let prefix =
    !!stack &&
    stack.open &&
    stack.baseBranch === queue.trunk &&
    queue.rebuildStack === 0 &&
    queue.trunk === queue.defaultBranch
  let base = queue.trunk
  for (const read of restack?.reads ??
    (await readMergeSnapshots(runtime, queue, entries, token))) {
    const { entry, snapshot, pull } = read
    const beforeRestack = reads.length < readyCount
    const syncing =
      !restack && entry.syncFrom != null && entry.syncFrom !== pull.headSha
    prefix =
      prefix &&
      beforeRestack &&
      !syncing &&
      snapshot?.pullBaseBranch === base &&
      matchesStack(queue, open[reads.length], entry, snapshot.headSha, base)
    const single =
      standalone &&
      reads.length === 0 &&
      beforeRestack &&
      !syncing &&
      snapshot?.pullBaseBranch === queue.trunk
    reads.push({
      ...read,
      stackNumber: prefix && stack ? stack.number : null,
      standalone: single,
      restackWait:
        restack && reads.length === restack.readyCount
          ? restack.wait
          : !beforeRestack
            ? 'lower-layer'
            : syncing
              ? 'rebase'
              : undefined,
      local:
        snapshot?.banner.state === 'ready-to-merge' && (prefix || single)
          ? await readMergeLocalWork(
              runtime,
              queue,
              entry,
              clicker ?? entry.queuerUserId,
            )
          : 'unavailable',
    })
    base = entry.branch
  }
  return reads
}

export async function readMergeSnapshots(
  runtime: QueueRuntime,
  queue: QueueRecord,
  entries: readonly QueueEntry[],
  token?: string,
): Promise<QueuePullSnapshot[]> {
  if (!entries.length) return []
  const credential =
    token ?? (await queueReadToken(runtime, queueWorkspace(queue, entries[0])))
  const reads: QueuePullSnapshot[] = []
  for (const entry of entries) {
    const reader = queueReader(
      runtime,
      queueWorkspace(queue, entry),
      credential,
    )
    reads.push({ entry, ...(await reader.queuedPull(entry.pullNumber)) })
  }
  const witness = reads.findLast(
    ({ pull }) => pull.state === 'OPEN' && pull.baseBranch === queue.trunk,
  )
  if (witness && witness.entry.pullNumber !== queue.trunkPullNumber)
    await rememberTrunkPull(runtime.env.DB, queue, witness.entry.pullNumber)
  return reads
}
