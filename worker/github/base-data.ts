import type { GitHubWorkspace } from './contracts'
import { requireGitBranchName } from './branch-name'
import { activeWorkspace } from './data'

export interface WorkspaceTargetChange {
  binding: GitHubWorkspace
  change: { from: string; to: string }
  target: string | null
}

/** Use the default branch from the same GitHub read as the new target. */
export async function writeWorkspaceTarget(
  db: D1Database,
  workspace: GitHubWorkspace,
  branch: string,
  defaultBranch: string,
): Promise<WorkspaceTargetChange | null> {
  requireGitBranchName(branch)
  const previous = workspace.baseBranch ?? null
  const from = previous ?? defaultBranch
  if (branch === from) return null

  const target = branch === defaultBranch ? null : branch
  const result = await db
    .prepare(
      `UPDATE workspaces SET base_branch = ?
       WHERE id = ? AND org_id = ? AND branch = ? AND base_branch IS ?
       AND archived_at IS NULL AND state != 'archived'
       AND EXISTS (SELECT 1 FROM orgs o WHERE o.id = workspaces.org_id
         AND o.deleted_at IS NULL AND o.suspended_at IS NULL)
       AND EXISTS (SELECT 1 FROM repositories r
         JOIN github_installations i ON i.id = r.installation_id
         WHERE r.id = workspaces.repository_id AND r.org_id = workspaces.org_id
         AND r.github_repository_id = ? AND r.installation_id = ? AND r.full_name = ?
         AND i.suspended_at IS NULL)`,
    )
    .bind(
      target,
      workspace.id,
      workspace.orgId,
      workspace.branch,
      previous,
      workspace.repositoryId,
      workspace.installationId,
      workspace.fullName,
    )
    .run()
  return result.meta.changes === 1
    ? { binding: workspace, change: { from, to: branch }, target }
    : null
}

/** The committed snapshot keeps the cause before these repairable D1 writes. */
export async function moveWorkspaceBase(
  db: D1Database,
  workspace: GitHubWorkspace,
  change: { from: string; to: string },
): Promise<GitHubWorkspace | null> {
  if (workspace.baseBranch === change.from)
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
