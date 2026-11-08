import { nextProviderRetry } from './provider-retry'
import type { StartJobStorage, WorkspaceStartJob } from './start-types'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'
import { WORKSPACE_START_TIME_LIMIT_MS } from './job-time-limit'

export function startDeadlineAt(job: WorkspaceStartJob, now: number): number {
  return (
    (job.kind === 'create' ? (job.creation?.createdAt ?? now) : now) +
    WORKSPACE_START_TIME_LIMIT_MS
  )
}

export function startTimeLimitReached(
  job: Pick<WorkspaceStartJob, 'deadlineAt'>,
  now: number,
) {
  return job.deadlineAt !== undefined && now >= job.deadlineAt
}

export function startAlarmDeadline(
  job:
    Pick<WorkspaceStartJob, 'deadlineAt' | 'cancelled' | 'failure'> | undefined,
  now: number,
): number {
  if (
    !job ||
    ((job.cancelled || job.failure) && startTimeLimitReached(job, now))
  )
    return Infinity
  return job.deadlineAt ?? Infinity
}

export async function readStartForAdvance(
  storage: StartJobStorage,
  endpoint: WorkspaceLifecycleEndpoint,
  now: number,
) {
  const job = await storage.job()
  if (!job || job.deadlineAt !== undefined) return job
  const startedAt = (await endpoint.readLifecycle())?.start?.startedAt ?? now
  const restored = { ...job, deadlineAt: startDeadlineAt(job, startedAt) }
  await storage.update(restored)
  return restored
}

export async function retryStartError(
  storage: StartJobStorage,
  error: unknown,
  now: number,
): Promise<boolean> {
  const current = await storage.job()
  if (
    !current ||
    current.cancelled ||
    current.failure ||
    startTimeLimitReached(current, now)
  )
    return false
  const retry = nextProviderRetry(current.providerRetry, error, now)
  return retry === null ? false : storage.retry(current.attempt, retry)
}
