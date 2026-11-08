import { providerState, type ProviderState } from './provider-state'
import type { SandboxProvider } from '../sandbox/provider'
import { requireActiveUser } from '../data/user-access'
import { WorkspaceStartError } from './workspace-start'
import { DISK_KEEPALIVE_MS, type DiskRetentionResult } from './durable-types'
import { JobTimeLimit } from './job-time-limit'
import {
  repositoryEnvironment,
  repositoryLocation,
} from './repository-locations'
import { workspaceRepositoryLocations } from './repository-location-data'
import { workspaceEnvironment, workspaceRepository } from './settings-data'
import { ensureWorkspaceToken, readWorkspaceToken } from './tokens'
import {
  readRetention,
  setRetention,
  clearRetention,
  type RetentionProgress,
} from './retention-data'
import {
  actionResources,
  type WorkspaceActionContext,
} from './workspace-actions'
import { revokeWorkspacePreviews } from './workspace-data'
import type { DurableLifecycle } from './durable'
import {
  advanceRetentionCommand,
  type RetentionCommandPort,
} from './retention-command'

/** The caller serializes this action with user starts in the workspace object. */
export async function keepWorkspaceDisk(
  context: WorkspaceActionContext,
  deadlineAt: number,
  command: RetentionCommandPort,
): Promise<DiskRetentionResult> {
  const { env, workspaceId, orgId } = context
  const { provider, sandboxId, row } = await actionResources(context)
  if (row.state !== 'stopped') {
    await clearRetention(env.DB, workspaceId)
    return { done: true, error: null }
  }
  let progress: RetentionProgress = (await readRetention(
    env.DB,
    workspaceId,
  )) ?? {
    phase: 'resume',
    error: null,
  }
  progress = await expireRetention(context, progress, deadlineAt)
  let status: ProviderState
  try {
    status = providerState((await provider.get(sandboxId)).state)
  } catch (error) {
    if (progress.phase === 'stop' && progress.error !== null)
      return { done: false, error: progress.error }
    throw error
  }
  progress = await expireRetention(context, progress, deadlineAt)
  if (progress.phase === 'stop')
    return stopWithResult(context, provider, sandboxId, status, progress.error)
  if (status === 'error') {
    await setRetention(
      env.DB,
      workspaceId,
      'stop',
      'The cloud computer failed during disk retention.',
    )
    return stopWithResult(
      context,
      provider,
      sandboxId,
      status,
      'The cloud computer failed during disk retention.',
    )
  }
  if (progress.phase === 'resume') {
    await setRetention(env.DB, workspaceId, 'resume')
    if (status === 'stopping') return { done: false, error: null }
    if (status === 'stopped') {
      await requireActiveUser(env.DB, row.ownerUserId)
      await ensureWorkspaceToken(
        env,
        workspaceId,
        context.dependencies.randomToken,
        context.dependencies.now(),
      )
      const environment = await workspaceEnvironment(env, orgId)
      const repository = await workspaceRepository(
        env.DB,
        orgId,
        row.repositoryId,
      )
      const token = await readWorkspaceToken(env, workspaceId)
      const locations = await workspaceRepositoryLocations(env.DB, workspaceId)
      await provider.resume(
        sandboxId,
        {
          ...environment,
          ...repositoryEnvironment(locations),
          WORKSPACE_TOKEN: token,
          CONDUCTIVE_WORKSPACE_ID: workspaceId,
          CONDUCTIVE_MACHINE_ORIGIN: env.MACHINE_ORIGIN ?? '',
          CONDUCTIVE_DEFAULT_BRANCH: repository.defaultBranch,
          CONDUCTIVE_REPOSITORY_DIR: repositoryLocation(
            locations,
            row.repositoryId,
          ),
          CONDUCTIVE_TURN_ID: '',
          CONDUCTIVE_DISK_KEEPALIVE: '1',
        },
        1_800,
      )
    }
    await setRetention(env.DB, workspaceId, 'wait')
    return { done: false, error: null }
  }
  if (progress.phase === 'wait') {
    if (status === 'stopped') {
      await setRetention(env.DB, workspaceId, 'resume')
      return { done: false, error: null }
    }
    if (status === 'ready') await setRetention(env.DB, workspaceId, 'startup')
    return { done: false, error: null }
  }
  if (progress.phase === 'startup') {
    if (status === 'stopped') {
      await setRetention(env.DB, workspaceId, 'resume')
      return { done: false, error: null }
    }
    if (status !== 'ready') return { done: false, error: null }
    return advanceRetentionCommand(
      context,
      provider,
      sandboxId,
      deadlineAt,
      command,
    )
  }
  return { done: false, error: null }
}

async function expireRetention(
  context: WorkspaceActionContext,
  progress: RetentionProgress,
  deadlineAt: number,
): Promise<RetentionProgress> {
  if (progress.phase === 'stop' || context.dependencies.now() < deadlineAt)
    return progress
  const error = new JobTimeLimit('start').message
  await setRetention(context.env.DB, context.workspaceId, 'stop', error)
  return { phase: 'stop', error }
}

async function stopWithResult(
  context: WorkspaceActionContext,
  provider: SandboxProvider,
  sandboxId: string,
  status: ProviderState,
  error: string | null,
): Promise<DiskRetentionResult> {
  try {
    return {
      done: await stopMaintenance(context, provider, sandboxId, status),
      error,
    }
  } catch (failure) {
    if (error !== null) return { done: false, error }
    throw failure
  }
}

async function stopMaintenance(
  context: WorkspaceActionContext,
  provider: SandboxProvider,
  sandboxId: string,
  status: ProviderState,
): Promise<boolean> {
  const { env, dependencies, workspaceId, orgId } = context
  if (status === 'stopping') return false
  let stopped = status === 'stopped'
  if (!stopped)
    stopped =
      providerState((await provider.stop(sandboxId)).state) === 'stopped'
  if (!stopped) return false
  await revokeWorkspacePreviews(env.DB, workspaceId, dependencies.now())
  await env.DB.prepare(
    'UPDATE workspaces SET stopped_at = ?, next_disk_keepalive_at = ? WHERE id = ? AND org_id = ? AND state = ?',
  )
    .bind(
      dependencies.now(),
      dependencies.now() + DISK_KEEPALIVE_MS,
      workspaceId,
      orgId,
      'stopped',
    )
    .run()
  await clearRetention(env.DB, workspaceId)
  return true
}

export async function finishDiskMaintenance(
  context: WorkspaceActionContext,
  lifecycle: DurableLifecycle,
): Promise<void> {
  try {
    if (
      await lifecycle.finishDiskMaintenance(async () => {
        const progress = await readRetention(
          context.env.DB,
          context.workspaceId,
        )
        if (progress?.phase === 'startup')
          await setRetention(
            context.env.DB,
            context.workspaceId,
            'stop',
            progress.error,
          )
        return Boolean(progress)
      })
    )
      return
  } catch {
    throw new WorkspaceStartError(null)
  }
  throw new WorkspaceStartError(null)
}
