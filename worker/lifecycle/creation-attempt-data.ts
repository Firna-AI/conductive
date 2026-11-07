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

export function creationSender(
  db: D1Database,
  workspaceId: string,
  orgId: string,
): Promise<{ senderUserId: string } | null> {
  return db
    .prepare(
      'SELECT sender_user_id AS senderUserId FROM workspace_creation_attempts WHERE workspace_id = ? AND org_id = ?',
    )
    .bind(workspaceId, orgId)
    .first<{ senderUserId: string }>()
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

/** A fresh actor waits for the failed actor's public-row deletion after publication. */
export async function previousFailedCreation(
  db: D1Database,
  input: {
    orgId: string
    senderUserId: string
    messageId: string
    workspaceId: string
  },
): Promise<boolean> {
  return Boolean(
    await db
      .prepare(
        `SELECT r.workspace_id FROM workspace_runtime r
    JOIN workspace_creation_attempts a ON a.workspace_id = r.workspace_id
    WHERE r.org_id = ? AND r.created_by_user_id = ? AND r.first_message_id = ?
      AND r.workspace_id != ? AND a.state = 'failed' LIMIT 1`,
      )
      .bind(input.orgId, input.senderUserId, input.messageId, input.workspaceId)
      .first(),
  )
}
