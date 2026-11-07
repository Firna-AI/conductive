import { providerState } from './provider-state'
import type { AppEnv } from '../env'
import { ProviderError } from '../sandbox/errors'
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

export async function finishFailedStart(
  env: AppEnv,
  endpoint: WorkspaceLifecycleEndpoint,
  storage: StartJobStorage,
  job: WorkspaceStartJob,
  provider: SandboxProvider | undefined,
): Promise<WorkspaceStartResult | null> {
  const failure = job.failure ?? {
    code: 'workspace_start_stopped',
    message: 'The cloud computer stopped.',
    status: 409,
  }
  if (job.kind === 'resume') {
    if (job.cancelled && provider && job.allocatedSandboxId) {
      try {
        if (
          providerState((await provider.stop(job.allocatedSandboxId)).state) !==
          'stopped'
        )
          return null
      } catch (error) {
        if (!(error instanceof ProviderError && error.kind === 'not_found'))
          return null
      }
    }
    if (!job.cancelled)
      await endpoint.lifecycleFailed({
        code: failure.code,
        message: failure.message,
        log: null,
      })
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
  if (!sandboxId && job.createPayloadCiphertext) {
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
    if (!sandboxId) return null
  }
  let cleanupPending = false
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
  return {
    ok: false,
    error: {
      code: cleanupPending ? 'workspace_cleanup_pending' : failure.code,
      message: cleanupPending
        ? 'The cloud computer could not start. Its cleanup will retry. Try again later.'
        : failure.message,
      log: null,
    },
  }
}
