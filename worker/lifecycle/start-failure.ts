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
import { revokeWorkspaceToken } from './tokens'
import { creationAdmissionResponse } from './creation-admission-response'
import { detachFailedSandbox } from './failed-workspace-data'

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
    !(
      error instanceof HttpError &&
      ['user_suspended', 'org_suspended'].includes(error.code)
    ) && startTimeLimitReached(job, now)
      ? new JobTimeLimit('start')
      : error
  const failure =
    caught instanceof HttpError ? caught : new WorkspaceStartError(null)
  const suspended = ['user_suspended', 'org_suspended'].includes(failure.code)
  return job.cancelled && !suspended
    ? job
    : {
        ...job,
        cancelled: job.cancelled || suspended,
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
    `Workspace start ${job.workspaceId} ends as failed in phase ${job.phase}: ${failure.code}${job.cancelled ? ', cancelled' : ''}`,
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
        (!job.failure ||
          ['user_suspended', 'org_suspended'].includes(job.failure.code)),
      ),
    )
    return {
      ok: false,
      error: { code: failure.code, message: failure.message, log: null },
    }
  }
  const first = await storage.firstMessage()
  const accepted =
    job.phase !== 'records' ||
    Boolean(first || (await endpoint.readLifecycle()))
  if (accepted && job.phase === 'records')
    await storage.update({
      ...job,
      phase: 'machine',
      admission: await creationAdmissionResponse(env, endpoint, job, first),
    })
  const row = await env.DB.prepare(
    'SELECT sandbox_id AS sandboxId FROM workspaces WHERE id = ? AND org_id = ?',
  )
    .bind(job.workspaceId, job.orgId)
    .first<{ sandboxId: string | null }>()
  let sandboxId = job.allocatedSandboxId ?? row?.sandboxId
  let cleanupPending = false
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
    }
  }
  if (sandboxId)
    await recordSandboxCleanup(env.DB, {
      workspaceId: job.workspaceId,
      orgId: job.orgId,
      sandboxId,
    })
  await revokeWorkspaceToken(env.DB, job.workspaceId, now())
  await detachFailedSandbox(
    env.DB,
    job.orgId,
    job.workspaceId,
    sandboxId ?? null,
  )
  await markCreationFailed(env.DB, job.workspaceId)
  if (accepted)
    await endpoint.lifecycleFailed({
      code: failure.code,
      message: failure.message,
      log: null,
    })
  else {
    await endpoint.clearLifecycle()
    await deleteProvisionalWorkspace(env.DB, job.orgId, job.workspaceId)
  }
  if (sandboxId) {
    try {
      if (!provider) throw new Error('Provider unavailable')
      await deleteSandboxIfPresent(provider, sandboxId)
      await clearSandboxCleanup(env.DB, job.workspaceId, sandboxId)
    } catch {
      cleanupPending = true
    }
  }
  if (cleanupPending) await endpoint.retryFailedCreateCleanup(job.workspaceId)
  return {
    ok: false,
    error: {
      code: failure.code,
      message: failure.message,
      log: null,
    },
  }
}
