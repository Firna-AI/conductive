import type { WorkspaceResponse } from '../../src/shared/workspaces'
import type { AppDependencies, AppEnv } from '../env'
import {
  archiveWorkspaceAccess,
  markWorkspaceArchived,
} from '../app-api/archive-data'
import { readWorkspace, workspaceView } from './workspace-data'

interface ArchiveOperations {
  reserveArchive(): Promise<void>
  archiveLifecycle(): Promise<void>
}

export async function archiveWorkspace(
  env: AppEnv,
  dependencies: AppDependencies,
  orgId: string,
  workspaceId: string,
  userId: string,
  _discard: boolean,
  origin: string,
  operations: ArchiveOperations,
): Promise<WorkspaceResponse> {
  const row = await archiveWorkspaceAccess(env, orgId, workspaceId, userId)
  if (row.archivedAt === null) {
    await operations.reserveArchive()
    await markWorkspaceArchived(
      env,
      orgId,
      workspaceId,
      userId,
      dependencies.now(),
    )
    await archiveWorkspaceAccess(env, orgId, workspaceId, userId)
  }
  await operations.archiveLifecycle()
  const saved = await readWorkspace(env.DB, orgId, workspaceId)
  return { workspace: workspaceView(saved, origin), start: null, error: null }
}
