import { warnWorker } from '../warnings'
import { warningCode, WarningId } from '../warning-values'
import type { AppDependencies, AppEnv } from '../env'
import { providerForAccount } from '../sandbox/client'
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
import { failRoutineWorkspaceStart } from '../routines/run-outcome-data'
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
  dependencies: Pick<AppDependencies, 'fetch' | 'now'>,
  finishResumeFailure: ResumeStartFailure,
): Promise<WorkspaceStartResult | null> {
  const failure = job.failure ?? {
    code: 'workspace_start_stopped',
    message: 'The cloud computer stopped.',
    status: 409,
  }
  warnWorker({
    kind: 'workspace_start_ended',
    workspaceId: WarningId.checked(job.workspaceId),
    phase: job.phase,
    code: warningCode(failure.code),
    cancelled: Boolean(job.cancelled),
  })
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
    'SELECT sandbox_id AS sandboxId, provider_account AS providerAccount FROM workspaces WHERE id = ? AND org_id = ?',
  )
    .bind(job.workspaceId, job.orgId)
    .first<{ sandboxId: string | null; providerAccount: string }>()
  let sandboxId = job.allocatedSandboxId ?? row?.sandboxId
  const providerAccount =
    job.allocatedSandboxId || !row?.sandboxId
      ? job.providerAccount
      : row.providerAccount
  let cleanupPending = false
  if (!sandboxId && job.createPayloadCiphertext) {
    const canDefer = () =>
      job.failure?.timeLimit || startTimeLimitReached(job, dependencies.now())
    if (!canDefer()) {
      if (!provider) return null
      sandboxId = await allocateWorkspace(
        env,
        providerForAccount(env, dependencies.fetch, job.providerAccount),
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
      providerAccount,
    })
  await revokeWorkspaceToken(env.DB, job.workspaceId, dependencies.now())
  await detachFailedSandbox(
    env.DB,
    job.orgId,
    job.workspaceId,
    sandboxId ?? null,
    providerAccount,
  )
  await markCreationFailed(env.DB, job.workspaceId, failure)
  await failRoutineWorkspaceStart(
    env.DB,
    job.workspaceId,
    failure,
    dependencies.now(),
  )
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
      await deleteSandboxIfPresent(
        env.DB,
        providerForAccount(env, dependencies.fetch, providerAccount),
        { sandboxId, providerAccount },
        dependencies.now(),
      )
      await clearSandboxCleanup(
        env.DB,
        job.workspaceId,
        sandboxId,
        providerAccount,
      )
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
