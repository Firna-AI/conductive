export async function revokedWorkspacePreviews(
  db: D1Database,
  workspaceId: string,
): Promise<string[]> {
  return (
    await db
      .prepare(
        'SELECT id FROM preview_hostnames WHERE workspace_id = ? AND revoked_at IS NOT NULL ORDER BY revoked_at, id',
      )
      .bind(workspaceId)
      .all<{ id: string }>()
  ).results.map((row) => row.id)
}
