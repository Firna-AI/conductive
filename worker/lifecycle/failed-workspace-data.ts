/** Cleanup detaches its own computer and cannot detach a later replacement. */
export async function detachFailedSandbox(
  db: D1Database,
  orgId: string,
  workspaceId: string,
  sandboxId: string | null,
): Promise<void> {
  await db
    .prepare(
      'UPDATE workspaces SET sandbox_id = NULL WHERE id = ? AND org_id = ? AND sandbox_id = ?',
    )
    .bind(workspaceId, orgId, sandboxId)
    .run()
}
