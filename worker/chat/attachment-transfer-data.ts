const DELETE_READY = `a.state = 'claimed' AND a.transferred_sandbox_id IS NOT NULL
  AND a.bytes_deleted_at IS NULL AND w.sandbox_id = a.transferred_sandbox_id
  AND w.org_id = a.org_id AND (
    EXISTS (SELECT 1 FROM workspace_creation_attempts c
      WHERE c.workspace_id = w.id AND c.state = 'succeeded')
    OR (NOT EXISTS (SELECT 1 FROM workspace_creation_attempts c WHERE c.workspace_id = w.id)
      AND w.state IN ('ready', 'working', 'unread', 'input', 'stopped', 'archived'))
  )`

export async function markAttachmentTransferred(
  db: D1Database,
  id: string,
  workspaceId: string,
  sandboxId: string,
  providerAccount: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE chat_attachments SET transferred_sandbox_id = ?
    WHERE id = ? AND state = 'claimed' AND claimed_workspace_id = ? AND bytes_deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM workspaces w WHERE w.id = chat_attachments.claimed_workspace_id
      AND w.org_id = chat_attachments.org_id AND w.sandbox_id = ? AND w.provider_account = ?)`,
    )
    .bind(sandboxId, id, workspaceId, sandboxId, providerAccount)
    .run()
  return result.meta.changes === 1
}

export function deletableTransferredAttachment(db: D1Database, id: string) {
  return db
    .prepare(
      `SELECT a.id FROM chat_attachments a
    JOIN workspaces w ON w.id = a.claimed_workspace_id WHERE a.id = ? AND ${DELETE_READY}`,
    )
    .bind(id)
    .first<{ id: string }>()
}

export async function transferredAttachmentBatch(
  db: D1Database,
  after: string,
) {
  return (
    await db
      .prepare(
        `SELECT a.id FROM chat_attachments a
    JOIN workspaces w ON w.id = a.claimed_workspace_id
    WHERE a.id > ? AND ${DELETE_READY} ORDER BY a.id LIMIT 32`,
      )
      .bind(after)
      .all<{ id: string }>()
  ).results
}

export async function markAttachmentBytesDeleted(
  db: D1Database,
  id: string,
  now: number,
) {
  await db
    .prepare(
      `UPDATE chat_attachments SET bytes_deleted_at = ?
    WHERE id = ? AND bytes_deleted_at IS NULL`,
    )
    .bind(now, id)
    .run()
}
