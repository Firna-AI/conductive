import { workspaceTokenResourcePredicate } from '../data/workspace-token-access'
import type { AttachmentRecord } from './attachment-record'

export interface AttachmentWorkspace {
  id: string
  orgId: string
  repositoryId: string
  sandboxId: string | null
  providerAccount: string
  firstMessageId: string | null
  creatorId: string | null
}

export function attachmentWorkspace(
  db: D1Database,
  id: string,
  userId: string,
) {
  return db
    .prepare(
      `SELECT w.id, w.org_id AS orgId, w.repository_id AS repositoryId, w.sandbox_id AS sandboxId,
    w.provider_account AS providerAccount,
    r.first_message_id AS firstMessageId, r.created_by_user_id AS creatorId
    FROM workspaces w LEFT JOIN workspace_runtime r ON r.workspace_id = w.id
    JOIN org_members m ON m.org_id = w.org_id JOIN users u ON u.id = m.user_id
    WHERE w.id = ? AND m.user_id = ? AND u.suspended_at IS NULL AND ${workspaceTokenResourcePredicate}`,
    )
    .bind(id, userId)
    .first<AttachmentWorkspace>()
}

export async function failedAttachmentWorkspace(db: D1Database, id: string) {
  return Boolean(
    await db
      .prepare(
        `SELECT 1 FROM workspace_creation_attempts a
    WHERE a.workspace_id = ? AND a.state = 'failed'
    AND NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.id = a.workspace_id)`,
      )
      .bind(id)
      .first(),
  )
}

export async function attachmentWorkspaceSurvives(
  db: D1Database,
  id: string,
  orgId: string,
) {
  return Boolean(
    await db
      .prepare('SELECT 1 FROM workspaces WHERE id = ? AND org_id = ?')
      .bind(id, orgId)
      .first(),
  )
}

export async function claimAttachment(
  db: D1Database,
  record: AttachmentRecord,
  workspaceId: string,
  messageId: string,
) {
  const result = await db
    .prepare(
      `UPDATE chat_attachments SET state = 'claimed',
    claimed_workspace_id = ?, claimed_message_id = ?, revision = revision + 1
    WHERE id = ? AND revision = ? AND state IN ('ready', 'claimed')
    AND EXISTS (SELECT 1 FROM workspaces w JOIN org_members m ON m.org_id = w.org_id
      JOIN users u ON u.id = m.user_id WHERE w.id = ? AND w.org_id = chat_attachments.org_id
      AND m.user_id = chat_attachments.uploader_user_id AND u.suspended_at IS NULL
      AND ${workspaceTokenResourcePredicate})`,
    )
    .bind(workspaceId, messageId, record.id, record.revision, workspaceId)
    .run()
  return result.meta.changes === 1
}
