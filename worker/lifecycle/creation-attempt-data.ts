export async function registerCreationAttempt(
  db: D1Database,
  input: {
    id: string
    orgId: string
    senderUserId: string
    messageId: string
    now: number
  },
): Promise<void> {
  await db
    .prepare(
      'INSERT OR IGNORE INTO workspace_creation_attempts (workspace_id, org_id, sender_user_id, first_message_id, created_at) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(input.id, input.orgId, input.senderUserId, input.messageId, input.now)
    .run()
}

export async function completeCreationAttempt(
  db: D1Database,
  workspaceId: string,
): Promise<void> {
  await db
    .prepare(
      "UPDATE workspace_creation_attempts SET state = 'succeeded' WHERE workspace_id = ? AND state = 'pending'",
    )
    .bind(workspaceId)
    .run()
}

export async function markCreationFailed(
  db: D1Database,
  workspaceId: string,
): Promise<void> {
  await db
    .prepare(
      "UPDATE workspace_creation_attempts SET state = 'failed' WHERE workspace_id = ?",
    )
    .bind(workspaceId)
    .run()
}
