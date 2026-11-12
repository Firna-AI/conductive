import { suspendedOrgError } from '../data/org-access'
import { HttpError } from '../http'
import type { GitHubWorkspace } from './contracts'
import { mergeWorkspace } from './merge-data'

export async function readMergeWorkspace(
  db: D1Database,
  orgId: string,
  id: string,
  userId: string,
): Promise<GitHubWorkspace> {
  const workspace = await mergeWorkspace(db, orgId, id, userId)
  if (!workspace)
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  if (workspace.orgSuspendedAt !== null) throw suspendedOrgError()
  if (workspace.archivedAt !== null || workspace.state === 'archived')
    throw new HttpError(
      409,
      'workspace_archived',
      'This workspace is archived.',
    )
  return workspace
}

export async function authorizeMerge(
  db: D1Database,
  workspace: GitHubWorkspace,
  userId: string,
): Promise<void> {
  const current = await readMergeWorkspace(
    db,
    workspace.orgId,
    workspace.id,
    userId,
  )
  if (
    current.repositoryId !== workspace.repositoryId ||
    current.installationId !== workspace.installationId ||
    current.branch !== workspace.branch
  )
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
}
