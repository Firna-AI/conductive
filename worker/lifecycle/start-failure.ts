import { warnWorker } from '../warnings'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import type { SandboxProvider } from '../sandbox/provider'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'
import type {
  WorkspaceStartJob,
  WorkspaceStartResult,
  StartJobStorage,
} from './start-types'
import { allocateWorkspace } from './start-allocation'
import {
  clearSandboxCleanup,
  deleteSandboxIfPresent,
  recordSandboxCleanup,
} from './cleanup'
import { deleteProvisionalWorkspace } from './workspace-data'
import { markCreationFailed } from './creation-attempt-data'
import { startTimeLimitReached } from './start-provider-retry'
import { JobTimeLimit } from './job-time-limit'
import { WorkspaceStartError } from './workspace-start'

export type ResumeStartFailure = (
  error: { code: string; message: string; log: null },
  cancelled: boolean,
) => Promise<void>

export function failedStartJob(
  job: WorkspaceStartJob,
  error: unknown,
  now: number,
): WorkspaceStartJob {
  const caught =
    !(error instanceof HttpError && error.code === 'user_suspended') &&
    startTimeLimitReached(job, now)
      ? new JobTimeLimit('start')
      : error
  const failure =
    caught instanceof HttpError ? caught : new WorkspaceStartError(null)
  return job.cancelled && failure.code !== 'user_suspended'
    ? job
    : {
        ...job,
        cancelled: job.cancelled || failure.code === 'user_suspended',
        failure: job.failure ?? {
          code: failure.code,
          message: failure.message,
          status: failure.status,
          timeLimit: caught instanceof JobTimeLimit,
        },
      }
}

export async function finishFailedStart(
  env: AppEnv,
  endpoint: WorkspaceLifecycleEndpoint,
  storage: StartJobStorage,
  job: WorkspaceStartJob,
  provider: SandboxProvider | undefined,
  now: () => number,
  finishResumeFailure: ResumeStartFailure,
): Promise<WorkspaceStartResult | null> {
  const failure = job.failure ?? {
    code: 'workspace_start_stopped',
    message: 'The cloud computer stopped.',
    status: 409,
  }
  warnWorker(
    `Workspace start ${job.workspaceId} ends as failed in phase ${job.phase}: ${failure.code}, ${failure.message}${job.cancelled ? ', cancelled' : ''}`,
  )
  if (job.kind === 'resume') {
    await finishResumeFailure(
      {
        code: failure.code,
        message: failure.message,
        log: null,
      },
      Boolean(
        job.cancelled &&
        (!job.failure || job.failure.code === 'user_suspended'),
      ),
    )
    return {
      ok: false,
      error: { code: failure.code, message: failure.message, log: null },
    }
  }
  await endpoint.retainLifecycleFailedCreation(
    { code: failure.code, message: failure.message, log: null },
    job.creation
      ? {
          workspaceId: job.workspaceId,
          orgId: job.orgId,
          senderUserId: job.creation.sender.id,
          sessionId: job.creation.sessionId,
          turnId: job.turnId,
          request: job.creation.request,
        }
      : undefined,
  )
  const row = await env.DB.prepare(
    'SELECT sandbox_id AS sandboxId FROM workspaces WHERE id = ? AND org_id = ?',
  )
    .bind(job.workspaceId, job.orgId)
    .first<{ sandboxId: string | null }>()
  let sandboxId = job.allocatedSandboxId ?? row?.sandboxId
  let cleanupPending = false
  let allocationDeferred = false
  if (!sandboxId && job.createPayloadCiphertext) {
    const canDefer = () =>
      job.failure?.timeLimit || startTimeLimitReached(job, now())
    if (!canDefer()) {
      if (!provider) return null
      sandboxId = await allocateWorkspace(
        env,
        provider,
        storage,
        job,
        async () => {
          throw new Error('Missing pinned allocation payload')
        },
      )
    }
    if (!sandboxId) {
      if (!canDefer()) return null
      await storage.deferAllocationCleanup(job)
      cleanupPending = true
      allocationDeferred = true
    }
  }
  if (sandboxId)
    await recordSandboxCleanup(env.DB, {
      workspaceId: job.workspaceId,
      orgId: job.orgId,
      sandboxId,
    })
  await markCreationFailed(env.DB, job.workspaceId)
  if (await endpoint.readLifecycle())
    await endpoint.lifecycleFailed({
      code: failure.code,
      message: failure.message,
      log: null,
    })
  await endpoint.clearLifecycle()
  await deleteProvisionalWorkspace(env.DB, job.orgId, job.workspaceId)
  if (sandboxId) {
    try {
      if (!provider) throw new Error('Provider unavailable')
      await deleteSandboxIfPresent(provider, sandboxId)
      await clearSandboxCleanup(env.DB, job.workspaceId)
    } catch {
      cleanupPending = true
    }
  }
  if (cleanupPending) await endpoint.retryFailedCreateCleanup(job.workspaceId)
  const reportCleanup =
    cleanupPending && !allocationDeferred && !job.failure?.timeLimit
  return {
    ok: false,
    error: {
      code: reportCleanup ? 'workspace_cleanup_pending' : failure.code,
      message: reportCleanup
        ? 'The cloud computer could not start. Its cleanup will retry. Try again later.'
        : failure.message,
      log: null,
    },
  }
}
