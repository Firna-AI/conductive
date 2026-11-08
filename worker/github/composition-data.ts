export async function installedRepository(
  db: D1Database,
  repositoryId: number,
  installationId: number,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT r.id FROM repositories r
    JOIN github_installations i ON i.id = r.installation_id AND i.suspended_at IS NULL
    JOIN orgs o ON o.id = r.org_id AND o.deleted_at IS NULL
    WHERE r.github_repository_id = ? AND r.installation_id = ? LIMIT 1`,
    )
    .bind(repositoryId, installationId)
    .first<{ id: string }>()
  return row !== null
}
