import type { WorkspaceResponse } from '../../src/shared/workspaces'
import type { AppDependencies, AppEnv } from '../env'
import {
  archiveWorkspaceAccess,
  markWorkspaceArchived,
} from '../app-api/archive-data'
import { readWorkspace, workspaceView } from './workspace-data'
import { leaveWorkspaceQueue } from '../merge-queue/wake'
import type { QueueTurn } from '../chat/queue-turn'

interface ArchiveOperations {
  reserveArchive(): Promise<void>
  archiveLifecycle(): Promise<void>
  outside: QueueTurn['outside']
}

export async function archiveWorkspace(
  env: AppEnv,
  dependencies: AppDependencies,
  orgId: string,
  workspaceId: string,
  userId: string,
  origin: string,
  operations: ArchiveOperations,
): Promise<WorkspaceResponse> {
  let row = await archiveWorkspaceAccess(env, orgId, workspaceId, userId)
  if (row.archivedAt === null) {
    await operations.reserveArchive()
    await markWorkspaceArchived(
      env,
      orgId,
      workspaceId,
      userId,
      dependencies.now(),
    )
    row = await archiveWorkspaceAccess(env, orgId, workspaceId, userId)
  }
  try {
    await operations.archiveLifecycle()
  } finally {
    if (row.archivedAt !== null)
      await operations.outside(() =>
        leaveWorkspaceQueue(env, row, 'archived', { actorId: userId }),
      )
  }
  const saved = await readWorkspace(env.DB, orgId, workspaceId)
  return { workspace: workspaceView(saved, origin), start: null, error: null }
}
