export async function recordRunningEnvironment(
  db: D1Database,
  workspaceId: string,
  ciphertext: string | null,
): Promise<void> {
  await db
    .prepare(
      'UPDATE workspace_runtime SET environment_ciphertext = ? WHERE workspace_id = ?',
    )
    .bind(ciphertext, workspaceId)
    .run()
}

export async function runningEnvironment(
  db: D1Database,
  workspaceId: string,
): Promise<string | null> {
  const row = await db
    .prepare(
      'SELECT environment_ciphertext AS ciphertext FROM workspace_runtime WHERE workspace_id = ?',
    )
    .bind(workspaceId)
    .first<{ ciphertext: string | null }>()
  return row?.ciphertext ?? null
}
