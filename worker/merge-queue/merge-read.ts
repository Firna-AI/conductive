import type { MergeQueueWait } from '../../src/shared/generated/MergeQueueWait'
import { workspaceBinding } from '../app-api/workspace-state'
import type { GitHubReader } from '../github/client'
import { HttpError } from '../http'
import type { QueueEntry, QueueRecord } from './contracts'
import { queueReader, queueReadToken, queueWorkspace } from './repository'
import type { QueueRestackRead } from './restacks'
import { hasOpenStack, matchesStack, readQueueStack } from './stack-read'
import type { QueueRuntime } from './step'

export type QueuePullSnapshot = Awaited<
  ReturnType<GitHubReader['queuedPull']>
> & {
  entry: QueueEntry
}

export interface QueuePullRead extends QueuePullSnapshot {
  /** Contiguous, checked membership in the saved GitHub stack. */
  stacked: boolean
  standalone: boolean
  clean: boolean
  restackWait?: MergeQueueWait
}

async function cleanWorkspace(
  runtime: QueueRuntime,
  queue: QueueRecord,
  entry: QueueEntry,
  userId: string,
) {
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
    if (error instanceof HttpError || error instanceof Error) return false
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
  const stack = restack
    ? restack.stack
    : await readQueueStack(queue, fetch, token)
  const open = stack?.layers.filter((layer) => layer.state === 'open') ?? []
  const standalone =
    queue.rebuildStack === 0 &&
    (entries.length === 1 || restack !== undefined) &&
    queue.trunk === queue.defaultBranch &&
    queue.githubStackNumber === null &&
    !(await hasOpenStack(fetch, token, queue, bottom.pullNumber))
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
    const beforeRestack = !restack || reads.length < restack.readyCount
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
      stacked: prefix,
      standalone: single,
      restackWait:
        restack && reads.length === restack.readyCount
          ? restack.wait
          : reads.length >= (restack?.readyCount ?? Infinity)
            ? 'lower-layer'
            : syncing
              ? 'rebase'
              : undefined,
      clean:
        snapshot?.banner.state === 'ready-to-merge' &&
        (prefix || single) &&
        (await cleanWorkspace(
          runtime,
          queue,
          entry,
          clicker ?? entry.queuerUserId,
        )),
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
  return reads
}
