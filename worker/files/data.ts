export interface FilesWorkspace {
  id: string
  orgId: string
  repositoryId: string
  repositoryFullName: string
  defaultBranch: string
  sandboxId: string | null
}

export function findFilesWorkspace(
  db: D1Database,
  orgId: string,
  workspaceId: string,
): Promise<FilesWorkspace | null> {
  return db
    .prepare(
      `SELECT w.id, w.org_id AS orgId, w.repository_id AS repositoryId,
        r.full_name AS repositoryFullName, r.default_branch AS defaultBranch,
        w.sandbox_id AS sandboxId
      FROM workspaces w JOIN repositories r ON r.id = w.repository_id AND r.org_id = w.org_id
      WHERE w.id = ? AND w.org_id = ? AND w.archived_at IS NULL AND w.state != 'archived'`,
    )
    .bind(workspaceId, orgId)
    .first<FilesWorkspace>()
}
