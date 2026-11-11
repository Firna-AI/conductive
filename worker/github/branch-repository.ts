interface BranchRepository {
  repositoryId: number
  fullName: string
  defaultBranch: string
  installationId: number
}

export function branchRepository(
  db: D1Database,
  orgId: string,
  repositoryId: string,
  userId: string,
): Promise<BranchRepository | null> {
  return db
    .prepare(
      `SELECT r.github_repository_id AS repositoryId, r.full_name AS fullName,
      r.default_branch AS defaultBranch, r.installation_id AS installationId
     FROM repositories r JOIN orgs o ON o.id = r.org_id
     JOIN github_installations i ON i.id = r.installation_id
     JOIN org_members m ON m.org_id = r.org_id
     JOIN users u ON u.id = m.user_id
     WHERE r.id = ? AND r.org_id = ? AND r.selected = 1
       AND o.deleted_at IS NULL AND i.suspended_at IS NULL
       AND m.user_id = ? AND u.suspended_at IS NULL`,
    )
    .bind(repositoryId, orgId, userId)
    .first<BranchRepository>()
}
