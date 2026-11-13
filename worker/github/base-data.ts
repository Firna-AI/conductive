import type { GitHubWorkspace } from './contracts'
import { activeWorkspace } from './data'

/** The committed snapshot keeps the cause before these repairable D1 writes. */
export async function moveWorkspaceBase(
  db: D1Database,
  workspace: GitHubWorkspace,
  change: { from: string; to: string },
): Promise<GitHubWorkspace | null> {
  await db.batch([
    db
      .prepare(
        `UPDATE repositories SET default_branch = ?
      WHERE org_id = ? AND github_repository_id = ? AND installation_id = ?
      AND EXISTS (SELECT 1 FROM workspaces w WHERE w.id = ? AND w.org_id = repositories.org_id
        AND w.repository_id = repositories.id AND w.branch = ? AND w.base_branch = ?)`,
      )
      .bind(
        change.to,
        workspace.orgId,
        workspace.repositoryId,
        workspace.installationId,
        workspace.id,
        workspace.branch,
        change.from,
      ),
    db
      .prepare(
        `UPDATE workspaces SET base_branch = NULL
      WHERE id = ? AND org_id = ? AND branch = ? AND base_branch = ?
      AND EXISTS (SELECT 1 FROM repositories r WHERE r.id = workspaces.repository_id
        AND r.org_id = workspaces.org_id AND r.github_repository_id = ? AND r.installation_id = ?)`,
      )
      .bind(
        workspace.id,
        workspace.orgId,
        workspace.branch,
        change.from,
        workspace.repositoryId,
        workspace.installationId,
      ),
  ])
  const current = await activeWorkspace(db, workspace.id, workspace.orgId)
  return current?.branch === workspace.branch &&
    current.baseBranch == null &&
    current.repositoryId === workspace.repositoryId &&
    current.installationId === workspace.installationId
    ? current
    : null
}
