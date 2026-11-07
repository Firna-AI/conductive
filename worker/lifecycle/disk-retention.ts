import { providerState, type ProviderState } from './provider-state'
import type { SandboxProvider } from '../sandbox/provider'
import { requireActiveUser } from '../data/user-access'
import { WorkspaceStartError } from './workspace-start'
import { DISK_KEEPALIVE_MS } from './durable-types'
import {
  repositoryEnvironment,
  repositoryLocation,
} from './repository-locations'
import { workspaceRepositoryLocations } from './repository-location-data'
import { workspaceStartupCommand } from './image-software'
import { readImageSettings, workspaceEnvironment } from './settings-data'
import { readWorkspaceToken } from './tokens'
import { readRetention, setRetention, clearRetention } from './retention-data'
import {
  actionResources,
  type WorkspaceActionContext,
} from './workspace-actions'
import { revokeWorkspacePreviews } from './workspace-data'
import type { DurableLifecycle } from './durable'

/** The caller serializes this action with user starts in the workspace object. */
export async function keepWorkspaceDisk(
  context: WorkspaceActionContext,
): Promise<boolean> {
  const { env, workspaceId, orgId } = context
  const { provider, sandboxId, row } = await actionResources(context)
  if (row.state !== 'stopped') {
    await clearRetention(env.DB, workspaceId)
    return true
  }
  const progress = (await readRetention(env.DB, workspaceId)) ?? {
    phase: 'resume',
    error: null,
  }
  const machine = await provider.get(sandboxId)
  const status = providerState(machine.state)
  if (status === 'error' && progress.phase !== 'stop') {
    await setRetention(
      env.DB,
      workspaceId,
      'stop',
      'The cloud computer failed during disk retention.',
    )
    return stopMaintenance(context, provider, sandboxId, status)
  }
  if (progress.phase === 'resume') {
    await setRetention(env.DB, workspaceId, 'resume')
    if (status === 'stopping') return false
    if (status === 'stopped') {
      await requireActiveUser(env.DB, row.ownerUserId)
      const environment = await workspaceEnvironment(env, orgId)
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
    return false
  }
  if (progress.phase === 'wait') {
    if (status === 'stopped') {
      await setRetention(env.DB, workspaceId, 'resume')
      return false
    }
    if (status === 'ready') await setRetention(env.DB, workspaceId, 'startup')
    return false
  }
  if (progress.phase === 'startup') {
    if (status === 'stopped') {
      await setRetention(env.DB, workspaceId, 'resume')
      return false
    }
    if (status !== 'ready') return false
    const settings = await readImageSettings(env.DB, orgId)
    let error: string | null = null
    try {
      const result = await provider.runCommand(
        sandboxId,
        workspaceStartupCommand(settings.startupScript, 'retention'),
      )
      if (result.exitCode !== 0 || result.timedOut)
        error = 'The startup script failed during disk retention.'
    } catch {
      error = 'The startup script could not run during disk retention.'
    }
    await setRetention(env.DB, workspaceId, 'stop', error)
    return false
  }
  return stopMaintenance(context, provider, sandboxId, status)
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
  await lifecycle.exclusive(async () => {
    if (!(await readRetention(context.env.DB, context.workspaceId))) return
    try {
      if (await keepWorkspaceDisk(context)) return
    } catch {
      throw new WorkspaceStartError(null)
    }
    throw new WorkspaceStartError(null)
  })
}
