import type { WorkspaceResponse } from '../../src/shared/workspaces'
import { HttpError } from '../http'
import {
  requireActiveOrg,
  requireActiveWorkspaceOwner,
} from '../data/user-access'
import { requireOrgMember } from './access'
import { readImageSettings, workspaceRepository } from './settings-data'
import { readWorkspace } from './workspace-data'
import { workspaceResponse } from './workspace-response'
import type { WorkspaceRuntime } from './workspace-runtime'
import { workspaceRepositoryLocations } from './repository-location-data'

export async function resumeWorkspace(
  runtime: WorkspaceRuntime,
  orgId: string,
  workspaceId: string,
  userId: string,
): Promise<WorkspaceResponse> {
  const { env, dependencies } = runtime
  await requireActiveOrg(env.DB, orgId)
  await requireOrgMember(env.DB, orgId, userId)
  const row = await readWorkspace(env.DB, orgId, workspaceId)
  const endpoint = runtime.workspace(workspaceId)
  if (row.archivedAt !== null)
    return workspaceResponse(runtime, orgId, workspaceId)
  if (row.state !== 'stopped' && row.state !== 'error')
    return workspaceResponse(runtime, orgId, workspaceId)
  await requireActiveWorkspaceOwner(env.DB, row.ownerUserId, orgId)
  if (!row.sandboxId)
    throw new HttpError(
      409,
      'sandbox_unavailable',
      'The cloud computer is not available. Try again.',
    )
  const settings = await readImageSettings(env.DB, orgId)
  const repository = await workspaceRepository(env.DB, orgId, row.repositoryId)
  await endpoint.queueLifecycleStart({
    workspaceId,
    orgId,
    kind: 'resume',
    requestedByUserId: userId,
    imageName: null,
    startupScript: settings.startupScript,
    environmentCiphertext: settings.envVarsCiphertext,
    defaultBranch: repository.defaultBranch,
    repositoryLocations: await workspaceRepositoryLocations(
      env.DB,
      workspaceId,
    ),
    turnId: row.firstTurnId,
    attempt: `resume-${workspaceId}-${dependencies.randomToken()}`,
    phase: 'machine',
    processId: null,
    stdoutOffset: 0,
    stderrOffset: 0,
    allocatedSandboxId: row.sandboxId,
  })
  return workspaceResponse(runtime, orgId, workspaceId)
}
