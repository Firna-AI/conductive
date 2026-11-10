/** Cleanup detaches its own computer and cannot detach a later replacement. */
export async function detachFailedSandbox(
  db: D1Database,
  orgId: string,
  workspaceId: string,
  sandboxId: string | null,
  providerAccount: string,
): Promise<void> {
  await db
    .prepare(
      'UPDATE workspaces SET sandbox_id = NULL WHERE id = ? AND org_id = ? AND sandbox_id = ? AND provider_account = ?',
    )
    .bind(workspaceId, orgId, sandboxId, providerAccount)
    .run()
}
