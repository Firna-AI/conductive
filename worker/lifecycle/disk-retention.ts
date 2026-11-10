import { providerState, type ProviderState } from './provider-state'
import { requireActiveUser } from '../data/user-access'
import { WorkspaceStartError } from './workspace-start'
import type { DiskRetentionResult } from './durable-types'
import { JobTimeLimit } from './job-time-limit'
import { workspaceRepositoryLocations } from './repository-location-data'
import {
  readImageSettings,
  workspaceEnvironmentSettings,
  workspaceRepository,
} from './settings-data'
import { sandboxEnvironment } from './sandbox-environment'
import { recordRunningEnvironment } from './start-environment'
import { ensureWorkspaceToken } from './tokens'
import {
  readRetention,
  setRetention,
  type RetentionProgress,
} from './retention-data'
import {
  actionResources,
  type WorkspaceActionContext,
} from './workspace-actions'
import type { DurableLifecycle } from './durable'
import {
  advanceRetentionCommand,
  type RetentionCommandPort,
} from './retention-command'
import { stopRetention } from './retention-stop'

/** The caller serializes this action with user starts in the workspace object. */
export async function keepWorkspaceDisk(
  context: WorkspaceActionContext,
  deadlineAt: number,
  command: RetentionCommandPort,
  confirmedStopped: boolean,
): Promise<DiskRetentionResult> {
  const { env, workspaceId, orgId } = context
  const { provider, sandboxId, row } = await actionResources(context)
  if (
    row.archivedAt !== null ||
    !(row.state === 'stopped' || (row.state === 'error' && confirmedStopped))
  )
    return { done: true, error: null, stoppedAt: null, eligible: false }
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
    return stopRetention(
      context,
      provider,
      sandboxId,
      status,
      progress.error,
      command,
    )
  if (status === 'error') {
    await setRetention(
      env.DB,
      workspaceId,
      'stop',
      'The cloud computer failed during disk retention.',
    )
    return stopRetention(
      context,
      provider,
      sandboxId,
      status,
      'The cloud computer failed during disk retention.',
      command,
    )
  }
  if (progress.phase === 'resume') {
    await setRetention(env.DB, workspaceId, 'resume')
    if (status === 'stopping') return { done: false, error: null }
    if (status === 'stopped') {
      await requireActiveUser(env.DB, row.ownerUserId, orgId)
      await ensureWorkspaceToken(
        env,
        workspaceId,
        context.dependencies.randomToken,
        context.dependencies.now(),
      )
      const settings = await readImageSettings(env.DB, orgId)
      const environment = await workspaceEnvironmentSettings(
        env,
        orgId,
        settings.envVarsCiphertext,
      )
      const repository = await workspaceRepository(
        env.DB,
        orgId,
        row.repositoryId,
      )
      const locations = await workspaceRepositoryLocations(env.DB, workspaceId)
      const runtimeEnv = await sandboxEnvironment(env, {
        workspace: row,
        environment,
        locations,
        defaultBranch: row.baseBranch ?? repository.defaultBranch,
        diskKeepalive: true,
      })
      await requireActiveUser(env.DB, row.ownerUserId, orgId)
      await recordRunningEnvironment(
        env.DB,
        workspaceId,
        settings.envVarsCiphertext,
      )
      await provider.resume(sandboxId, runtimeEnv, 1_800)
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
