import type { WorkspaceResponse } from '../../src/shared/workspaces'
import { WORKSPACE_RESTORE_MS } from '../../src/shared/workspaces'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { requireActiveOrg } from '../data/user-access'
import { requireOrgMember } from '../members/permissions'
import { readWorkspace, workspaceView } from './workspace-data'
import { readArchiveResource, restoreArchiveRecord } from './archive-data'
import type { WorkspaceArchive } from './archive-state'

export async function restoreWorkspace(
  env: AppEnv,
  dependencies: AppDependencies,
  orgId: string,
  workspaceId: string,
  userId: string,
  origin: string,
  archive: WorkspaceArchive,
): Promise<WorkspaceResponse> {
  await requireActiveOrg(env.DB, orgId)
  await requireOrgMember(env.DB, orgId, userId)
  let row = await readWorkspace(env.DB, orgId, workspaceId)
  if (row.archivedAt !== null) {
    if (
      !row.sandboxId ||
      dependencies.now() >= row.archivedAt + WORKSPACE_RESTORE_MS
    )
      throw restoreUnavailable(row.sandboxId !== null)
    await archive.begin(workspaceId)
    const stopped = await archive.finishStop()
    const resource = await readArchiveResource(env.DB, workspaceId)
    if (
      !resource ||
      !(await restoreArchiveRecord(
        env.DB,
        resource,
        userId,
        dependencies.now(),
      ))
    ) {
      await requireActiveOrg(env.DB, orgId)
      await requireOrgMember(env.DB, orgId, userId)
      throw restoreUnavailable(resource?.sandboxId !== null)
    }
    row = await readWorkspace(env.DB, orgId, workspaceId)
    await archive.restored(!stopped)
  } else await archive.restored()
  return { workspace: workspaceView(row, origin), start: null, error: null }
}

function restoreUnavailable(expired: boolean) {
  return new HttpError(
    409,
    'workspace_restore_unavailable',
    expired
      ? 'The time to restore this workspace has ended.'
      : 'No cloud computer is available to restore.',
  )
}
