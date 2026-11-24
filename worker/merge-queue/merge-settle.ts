import { workspaceBinding } from '../app-api/workspace-state'
import { requireFeatureResult } from '../features/result'
import { activeWorkspace } from '../github/data'
import { recordPullRequestMerge } from '../github/merge-record-data'
import { warnWorker } from '../warnings'
import type { QueueEntry, QueueRecord } from './contracts'
import { readQueue, readQueueEntries } from './data'
import { queueLeaveFor } from './merge-choice'
import { finishQueueMerge, markMergeRefused } from './merge-data'
import type { QueueMergeJob } from './merge-job'
import { readMergeSnapshots, type QueuePullSnapshot } from './merge-read'
import { queueWorkspace } from './repository'
import { leaveQueue, type QueueRuntime } from './step'

async function refreshStackTop(
  runtime: QueueRuntime,
  job: Extract<QueueMergeJob, { stage: 'settling' }>,
) {
  const { env } = runtime
  const { queue, target, outcome } = job
  const workspace = await activeWorkspace(
    env.DB,
    target.workspaceId,
    queue.orgId,
  )
  if (
    workspace?.branch !== target.branch ||
    workspace.repositoryId !== queue.githubRepositoryId ||
    workspace.installationId !== queue.installationId
  )
    return true
  try {
    const reply = requireFeatureResult(
      await workspaceBinding(env)
        .getByName(target.workspaceId)
        .refreshGitHub(workspace, {}),
    )
    return (
      outcome !== 'merged' ||
      (reply?.banner.state === 'merged' &&
        reply.banner.pullRequest.number === target.pullNumber)
    )
  } catch {
    warnWorker({ kind: 'merge_queue_refresh_failed' })
    return outcome !== 'merged'
  }
}

export async function reconcileMergePulls(
  runtime: QueueRuntime,
  queue: QueueRecord,
  entries: QueueEntry[],
  reads: readonly QueuePullSnapshot[],
  job?: QueueMergeJob,
) {
  const { env, dependencies } = runtime
  let remaining = entries
  for (const { entry, pull } of reads) {
    if (pull.state === 'MERGED') {
      const workspace = queueWorkspace(queue, entry)
      await recordPullRequestMerge(
        env.DB,
        {
          repositoryId: queue.githubRepositoryId,
          orgId: queue.orgId,
          workspaceId: entry.workspaceId,
          number: entry.pullNumber,
          mergedAt: pull.mergedAt ?? dependencies.now(),
        },
        dependencies.now(),
      )
      try {
        requireFeatureResult(
          await workspaceBinding(env)
            .getByName(workspace.id)
            .refreshGitHub(workspace, {}),
        )
      } catch {
        warnWorker({ kind: 'merge_queue_refresh_failed' })
      }
    }
    const cause =
      pull.state === 'MERGED'
        ? 'merged'
        : pull.state === 'CLOSED'
          ? 'closed'
          : pull.draft
            ? 'draft'
            : null
    if (cause) {
      const merge =
        cause === 'merged' &&
        job?.layers.some(
          ({ entry: saved }) =>
            saved.workspaceId === entry.workspaceId &&
            saved.queuedAt === entry.queuedAt &&
            saved.pullNumber === entry.pullNumber &&
            saved.unitId === entry.unitId,
        )
          ? job
          : undefined
      remaining = await leaveQueue(runtime, queue, remaining, {
        ...queueLeaveFor(entry),
        cause,
        ...(merge && { actorId: merge.userId }),
        ...(merge?.memberStackNumber !== undefined && {
          memberStackMerge: true,
        }),
      })
    }
  }
  return remaining
}

export async function settleMergeJob(
  runtime: QueueRuntime,
  job: Extract<QueueMergeJob, { stage: 'settling' }>,
) {
  const { env, dependencies } = runtime
  const queue = await readQueue(env.DB, job.queue)
  if (!queue) return true
  const now = dependencies.now()
  const entries = await readQueueEntries(env.DB, queue.id)
  const reads = await readMergeSnapshots(runtime, queue, entries)
  const remaining = await reconcileMergePulls(
    runtime,
    queue,
    entries,
    reads,
    job.outcome === 'refresh' && !job.stackPullNumbers ? undefined : job,
  )
  if (job.stackPullNumbers && !(await refreshStackTop(runtime, job)))
    return false
  const target = reads.find(
    ({ entry }) => entry.workspaceId === job.target.workspaceId,
  )
  if (
    job.outcome === 'merged' &&
    target?.pull.state !== 'MERGED' &&
    remaining.some((entry) => entry.workspaceId === job.target.workspaceId)
  )
    return false
  await finishQueueMerge(env.DB, queue, now)
  if (job.outcome === 'refused') await markMergeRefused(env.DB, job, now)
  return true
}
