export async function creationStartBranch(
  db: D1Database,
  workspaceId: string,
): Promise<string | undefined> {
  const plan = await db
    .prepare(
      `SELECT COALESCE(start_branch, base_branch, default_branch) AS startBranch
     FROM workspace_creation_plans WHERE workspace_id = ?`,
    )
    .bind(workspaceId)
    .first<{ startBranch: string }>()
  return plan?.startBranch
}
