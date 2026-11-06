import type { WorkspaceResponse } from '../../src/shared/workspaces'
import { HttpError } from '../http'
import { lifecycleProvider } from './lifecycle-provider'
import { requireOrgMember } from './access'
import { readImageSettings, workspaceRepository } from './settings-data'
import { readWorkspace } from './workspace-data'
import { workspaceResponse } from './workspace-response'
import { WorkspaceStartError } from './workspace-start'
import type { WorkspaceRuntime } from './workspace-runtime'

export async function resumeWorkspace(
  runtime: WorkspaceRuntime,
  orgId: string,
  workspaceId: string,
  userId: string,
): Promise<WorkspaceResponse> {
  const { env, dependencies } = runtime
  await requireOrgMember(env.DB, orgId, userId)
  const row = await readWorkspace(env.DB, orgId, workspaceId)
  const endpoint = runtime.workspace(workspaceId)
  if (row.archivedAt !== null)
    return workspaceResponse(runtime, orgId, workspaceId)
  if (row.state !== 'stopped' && row.state !== 'error')
    return workspaceResponse(runtime, orgId, workspaceId)
  if (!row.sandboxId)
    throw new HttpError(
      409,
      'sandbox_unavailable',
      'The cloud computer is not available. Try again.',
    )
  await lifecycleProvider(env, userId, orgId, dependencies.fetch)
  const settings = await readImageSettings(env.DB, orgId)
  const repository = await workspaceRepository(env.DB, orgId, row.repositoryId)
  const accepted = await endpoint.queueLifecycleStart({
    workspaceId,
    orgId,
    kind: 'resume',
    imageName: null,
    startupScript: settings.startupScript,
    environmentCiphertext: settings.envVarsCiphertext,
    defaultBranch: repository.defaultBranch,
    turnId: row.firstTurnId,
    attempt: `resume-${workspaceId}-${dependencies.randomToken()}`,
    phase: 'machine',
    processId: null,
    stdoutOffset: 0,
    stderrOffset: 0,
    allocatedSandboxId: row.sandboxId,
  })
  if (!accepted) return workspaceResponse(runtime, orgId, workspaceId)
  const result = await endpoint.waitLifecycleStart()
  if (!result.ok)
    throw Object.assign(new WorkspaceStartError(result.error.log), result.error)
  return workspaceResponse(runtime, orgId, workspaceId)
}

export async function openWorkspace(
  runtime: WorkspaceRuntime,
  orgId: string,
  workspaceId: string,
  userId: string,
  tabId: string,
): Promise<WorkspaceResponse> {
  await requireOrgMember(runtime.env.DB, orgId, userId)
  await readWorkspace(runtime.env.DB, orgId, workspaceId)
  await runtime.workspace(workspaceId).openLifecycleTab(tabId)
  return resumeWorkspace(runtime, orgId, workspaceId, userId)
}
