import type { Workspace, WorkspaceResponse } from '../../src/shared/workspaces'
import type { AppDependencies, AppEnv } from '../env'
import { readArchiveCheck } from '../app-api/archive'
import {
  archiveWorkspaceAccess,
  markWorkspaceArchived,
} from '../app-api/archive-data'
import { HttpError } from '../http'
import { orgProviderForAccount } from '../sandbox/client'
import { deleteSandboxIfPresent } from './cleanup'
import { readWorkspace, workspaceRecord, workspaceView } from './workspace-data'

interface ArchiveOperations {
  revokePreviews(): Promise<void>
  stopChat(): Promise<void>
  clearLifecycle(): Promise<void>
  publish(workspace: Omit<Workspace, 'link'>): Promise<void>
}

export async function archiveWorkspace(
  env: AppEnv,
  dependencies: AppDependencies,
  orgId: string,
  workspaceId: string,
  userId: string,
  discard: boolean,
  origin: string,
  operations: ArchiveOperations,
): Promise<WorkspaceResponse> {
  const row = await archiveWorkspaceAccess(env, orgId, workspaceId, userId)
  if (row.archivedAt === null) {
    const check = await readArchiveCheck(
      env,
      dependencies,
      orgId,
      workspaceId,
      userId,
    )
    if (!discard && (check.uncommittedFiles.length || check.unpushedCommits))
      throw new HttpError(
        409,
        'workspace_has_unpushed_work',
        'Check the saved work before you archive this workspace.',
      )
    await operations.revokePreviews()
    await operations.stopChat()
    if (row.sandboxId) {
      await archiveWorkspaceAccess(env, orgId, workspaceId, userId)
      const provider = await orgProviderForAccount(
        env,
        userId,
        orgId,
        dependencies.fetch,
        row.providerAccount,
      )
      await deleteSandboxIfPresent(
        env.DB,
        provider,
        row.sandboxId,
        dependencies.now(),
      )
    }
    await archiveWorkspaceAccess(env, orgId, workspaceId, userId)
    await markWorkspaceArchived(
      env,
      orgId,
      workspaceId,
      userId,
      dependencies.now(),
    )
    await operations.clearLifecycle()
  }
  const saved = await readWorkspace(env.DB, orgId, workspaceId)
  await operations.publish(workspaceRecord(saved))
  return { workspace: workspaceView(saved, origin), start: null, error: null }
}
