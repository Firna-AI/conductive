import type { AppEnv } from '../env'
import {
  requireActiveOrg,
  requireActiveWorkspaceOwner,
} from '../data/user-access'
import { requireOrgMember } from '../lifecycle/access'
import { readWorkspace } from '../lifecycle/workspace-data'
import { workspaceNotRunning } from '../lifecycle/durable-restart'
import { requireRunning, workspaceTarget } from '../previews/access'
import type { WorkspaceTarget } from '../previews/types'
import { HttpError } from '../http'
import { sameComputer } from './binding'

/** Reuse the header Restart access checks without its transition or activity. */
export async function requireServiceControlAccess(
  env: AppEnv,
  target: WorkspaceTarget,
  userId: string,
): Promise<void> {
  await requireActiveOrg(env.DB, target.orgId)
  await requireOrgMember(env.DB, target.orgId, userId)
  const row = await readWorkspace(env.DB, target.orgId, target.workspaceId)
  if (row.archivedAt !== null || !row.sandboxId) throw workspaceNotRunning()
  await requireActiveWorkspaceOwner(env.DB, row.ownerUserId, target.orgId)
  const current = await workspaceTarget(
    env,
    target.orgId,
    target.workspaceId,
    userId,
  )
  if (!sameComputer(current, target))
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  requireRunning(current)
}
