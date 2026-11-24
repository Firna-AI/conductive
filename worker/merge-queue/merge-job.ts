import type { GitHubMergeRequest } from '../../src/shared/generated/GitHubMergeRequest'
import { readMergeWorkspace } from '../github/merge-access'
import { matchesDirectMerge, requestMerge } from '../github/merge-client'
import { repositoryMemberGitHub } from '../github/member-github'
import { githubFailure } from '../github/parsers'
import { HttpError } from '../http'
import { warnWorker } from '../warnings'
import type { QueueMergeTarget, QueueRecord } from './contracts'
import { queueOfPulls } from './data'
import { queueMergeAccess } from './merge-choice'
import {
  clearMergeHeads,
  finishQueueMerge,
  liveMergePrefix,
  markQueueMerging,
} from './merge-data'
import { readMergeLocalWork } from './merge-read'
import { verifyMergePrefix, type CheckedLayer } from './merge-verify'
import { settleMergeJob } from './merge-settle'
import { saveQueueAlarm } from './queue-alarm'
import { queueReadToken, queueWorkspace } from './repository'
import type { QueueRuntime } from './step'

export type QueueMergeJob = {
  queue: QueueRecord
  layers: CheckedLayer[]
  target: QueueMergeTarget
  userId: string
  input: GitHubMergeRequest
  memberStackNumber?: number
  /** The exact open prefix when the clicked pull request has no queue entry. */
  stackPullNumbers?: readonly number[]
  nextAt: number
} & (
  | { stage: 'starting'; sent?: boolean }
  | { stage: 'polling'; uuid: string }
  | { stage: 'settling'; outcome: 'merged' | 'refused' | 'refresh' }
)

type StartingJob = Extract<QueueMergeJob, { stage: 'starting' }>
type PollingJob = Extract<QueueMergeJob, { stage: 'polling' }>
type MergeMember = Awaited<ReturnType<typeof repositoryMemberGitHub>>

const JOB = 'merge-queue:merge-job'
const POLL_MS = 2_000
export const MERGE_RETRY_MS = 30_000

/** Stores one merge for the queue and resumes it on its alarm. */
export class QueueMergeJobs {
  private readonly runtime: QueueRuntime
  private readonly storage: DurableObjectStorage

  constructor(runtime: QueueRuntime, storage: DurableObjectStorage) {
    this.runtime = runtime
    this.storage = storage
  }

  active() {
    return this.storage.get<QueueMergeJob>(JOB)
  }

  async start(job: StartingJob, member: MergeMember) {
    await this.save(job)
    return this.advance(job, member)
  }

  async resume() {
    const job = await this.active()
    if (!job) return false
    if (job.nextAt > this.runtime.dependencies.now())
      await this.storage.transaction((storage) =>
        saveQueueAlarm(storage, job.queue, job.nextAt),
      )
    else await this.advance(job)
    return true
  }

  private save(job: QueueMergeJob) {
    return this.storage.transaction(async (storage) => {
      await storage.put(JOB, job)
      await saveQueueAlarm(storage, job.queue, job.nextAt)
    })
  }

  private finish(job: QueueMergeJob, at: number) {
    return this.storage.transaction(async (storage) => {
      await storage.delete(JOB)
      await saveQueueAlarm(storage, job.queue, at)
    })
  }

  private async advance(job: QueueMergeJob, prepared?: MergeMember) {
    const { env, dependencies } = this.runtime
    const now = dependencies.now()
    const retryAt = now + MERGE_RETRY_MS
    await this.save({ ...job, nextAt: retryAt })
    try {
      if (job.stage === 'settling') {
        if (await settleMergeJob(this.runtime, job))
          await this.finish(job, job.outcome === 'refresh' ? retryAt : now)
        return true
      }
      const next = await sendQueueMerge(
        this.runtime,
        job,
        async (starting) => {
          await markQueueMerging(
            env.DB,
            starting.queue,
            starting.layers.map(({ entry }) => entry),
            now,
          )
          await this.save({ ...starting, sent: true, nextAt: retryAt })
        },
        prepared,
      )
      if (!next) {
        // A starting job saved before the sent field existed may already be on GitHub.
        if (job.stage !== 'starting' || job.sent !== false) return true
        await finishQueueMerge(env.DB, job.queue, now)
        await clearMergeHeads(env.DB, job.queue)
        await this.finish(job, now)
        return false
      }
      await this.save({
        ...next,
        nextAt: dependencies.now() + (next.stage === 'polling' ? POLL_MS : 0),
      })
    } catch {
      warnWorker({ kind: 'merge_queue_merge_retry' })
    }
    return true
  }
}

function memberUnavailable(error: unknown) {
  return (
    error instanceof HttpError &&
    [
      'workspace_not_found',
      'workspace_archived',
      'org_suspended',
      'github_reconnect_required',
      'github_refresh_failed',
    ].includes(error.code)
  )
}

export async function prepareQueueMerge(
  runtime: QueueRuntime,
  job: StartingJob,
) {
  const { queue, target, userId, input } = job
  try {
    const access = await queueMergeAccess(runtime, queue, target, userId)
    if (
      access.kind !== 'write' ||
      !access.capabilities.allowedMethods.includes(input.method)
    )
      return null
    return (await verifyMergePrefix(runtime, job, access.member))
      ? access.member
      : null
  } catch (error) {
    if (memberUnavailable(error)) return null
    throw error
  }
}

async function pollQueueMerge(runtime: QueueRuntime, job: PollingJob) {
  const { env, dependencies } = runtime
  const { queue, target, userId, uuid } = job
  try {
    const workspace = await readMergeWorkspace(
      env.DB,
      queue.orgId,
      target.workspaceId,
      userId,
    )
    if (
      workspace.repositoryId === queue.githubRepositoryId &&
      workspace.installationId === queue.installationId &&
      workspace.branch === target.branch
    ) {
      const member = await repositoryMemberGitHub(
        env,
        dependencies,
        workspace,
        userId,
      )
      const reply = await requestMerge(
        member.fetch,
        member.token,
        queue.fullName,
        target.pullNumber,
        uuid,
      )
      if (reply.status !== 401 && reply.status !== 403) return reply
    }
  } catch (error) {
    if (!memberUnavailable(error)) throw error
  }
  // A member can lose access after GitHub accepts the write. Finish with a read token.
  const token = await queueReadToken(runtime, queueWorkspace(queue, target))
  return requestMerge(
    dependencies.fetch,
    token,
    queue.fullName,
    target.pullNumber,
    uuid,
  )
}

async function sendQueueMerge(
  runtime: QueueRuntime,
  job: StartingJob | PollingJob,
  beforeSend: (job: StartingJob) => Promise<void>,
  prepared?: MergeMember,
): Promise<QueueMergeJob | null> {
  const { queue, target, input } = job
  let reply: Awaited<ReturnType<typeof requestMerge>>
  if (job.stage === 'starting') {
    const member = prepared ?? (await prepareQueueMerge(runtime, job))
    if (!member) return { ...job, stage: 'settling', outcome: 'refresh' }
    const prefix = job.layers.map(({ entry }) => entry)
    const workspaces = job.stackPullNumbers ? [...prefix, target] : prefix
    for (const entry of workspaces) {
      if (
        (await readMergeLocalWork(runtime, queue, entry, job.userId)) !==
        'clean'
      )
        return null
    }
    if (
      !(await liveMergePrefix(runtime.env.DB, queue, prefix)) ||
      (job.stackPullNumbers &&
        ((await queueOfPulls(runtime.env.DB, queue, job.stackPullNumbers)) !==
          'same-org' ||
          (await queueOfPulls(
            runtime.env.DB,
            queue,
            job.stackPullNumbers.slice(prefix.length),
          ))))
    )
      return { ...job, stage: 'settling', outcome: 'refresh' }
    await beforeSend(job)
    reply = await requestMerge(
      member.fetch,
      member.token,
      queue.fullName,
      target.pullNumber,
      input,
    )
  } else {
    reply = await pollQueueMerge(runtime, job)
  }

  const { result, status } = reply
  if (
    status === 429 ||
    (job.stage === 'polling' && (status === 401 || status === 403))
  )
    throw githubFailure()
  if (status === 401) return { ...job, stage: 'settling', outcome: 'refresh' }
  if (
    result?.state === 'pending' &&
    matchesDirectMerge(result, input) &&
    (job.stage === 'starting' || result.uuid === job.uuid)
  )
    return { ...job, stage: 'polling', uuid: result.uuid }
  return {
    ...job,
    stage: 'settling',
    outcome: result?.state === 'merged' ? 'merged' : 'refused',
  }
}
