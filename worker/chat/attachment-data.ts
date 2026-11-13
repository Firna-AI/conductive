import type { AttachmentRecord } from './attachment-record'

const COLUMNS = `id, org_id AS orgId, uploader_user_id AS uploaderUserId,
 target_kind AS targetKind, target_id AS targetId, name, kind, media_type AS mediaType,
 size_bytes AS sizeBytes, object_key AS objectKey, multipart_id AS multipartId, state,
 created_at AS createdAt, expires_at AS expiresAt, claimed_workspace_id AS claimedWorkspaceId,
 claimed_message_id AS claimedMessageId, transferred_sandbox_id AS transferredSandboxId,
 bytes_deleted_at AS bytesDeletedAt, revision`

export function readAttachment(db: D1Database, id: string) {
  return db
    .prepare(`SELECT ${COLUMNS} FROM chat_attachments WHERE id = ?`)
    .bind(id)
    .first<AttachmentRecord>()
}

export async function insertAttachment(
  db: D1Database,
  record: AttachmentRecord,
) {
  const result = await db
    .prepare(
      `INSERT INTO chat_attachments
    (id, org_id, uploader_user_id, target_kind, target_id, name, kind, media_type,
     size_bytes, object_key, multipart_id, state, created_at, expires_at)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE EXISTS (SELECT 1 FROM orgs o JOIN org_members m ON m.org_id = o.id
      JOIN users u ON u.id = m.user_id WHERE o.id = ? AND m.user_id = ?
      AND o.deleted_at IS NULL AND o.suspended_at IS NULL AND u.suspended_at IS NULL)
    AND (? = 'new-workspace' OR EXISTS (SELECT 1 FROM workspaces w
      WHERE w.id = ? AND w.org_id = ? AND w.archived_at IS NULL))`,
    )
    .bind(
      record.id,
      record.orgId,
      record.uploaderUserId,
      record.targetKind,
      record.targetId,
      record.name,
      record.kind,
      record.mediaType,
      record.sizeBytes,
      record.objectKey,
      record.multipartId,
      record.state,
      record.createdAt,
      record.expiresAt,
      record.orgId,
      record.uploaderUserId,
      record.targetKind,
      record.targetId,
      record.orgId,
    )
    .run()
  return result.meta.changes === 1
}

export async function setAttachmentState(
  db: D1Database,
  record: AttachmentRecord,
  state: AttachmentRecord['state'],
) {
  const result = await db
    .prepare(
      `UPDATE chat_attachments SET state = ?, revision = revision + 1
    WHERE id = ? AND revision = ? AND state = ?`,
    )
    .bind(state, record.id, record.revision, record.state)
    .run()
  return result.meta.changes === 1
}

export async function publishAttachment(
  db: D1Database,
  record: AttachmentRecord,
  sizeBytes: number,
  now: number,
) {
  const result = await db
    .prepare(
      `UPDATE chat_attachments SET state = 'ready', size_bytes = ?,
    multipart_id = NULL, revision = revision + 1
    WHERE id = ? AND state = 'uploading' AND revision = ? AND expires_at > ?
    AND EXISTS (SELECT 1 FROM orgs o JOIN org_members m ON m.org_id = o.id
      JOIN users u ON u.id = m.user_id WHERE o.id = chat_attachments.org_id
      AND m.user_id = chat_attachments.uploader_user_id AND o.deleted_at IS NULL
      AND o.suspended_at IS NULL AND u.suspended_at IS NULL)
    AND (target_kind = 'new-workspace' OR EXISTS (SELECT 1 FROM workspaces w
      WHERE w.id = target_id AND w.org_id = chat_attachments.org_id AND w.archived_at IS NULL))`,
    )
    .bind(sizeBytes, record.id, record.revision, now)
    .run()
  return result.meta.changes === 1
}

export async function saveAttachmentMultipart(
  db: D1Database,
  id: string,
  multipartId: string,
) {
  const result = await db
    .prepare(
      `UPDATE chat_attachments SET multipart_id = ?
    WHERE id = ? AND state = 'uploading' AND multipart_id IS NULL`,
    )
    .bind(multipartId, id)
    .run()
  return result.meta.changes === 1
}

export async function attachmentBatch(
  db: D1Database,
  options: {
    orgId?: string
    workspaceId?: string
    now?: number
    after?: string
  },
) {
  let where: string
  let value: string | number
  if (options.orgId !== undefined) {
    where = 'org_id = ?'
    value = options.orgId
  } else if (options.workspaceId !== undefined) {
    where =
      "(claimed_workspace_id = ? OR (target_kind = 'workspace' AND target_id = ?))"
    return (
      await db
        .prepare(
          `SELECT ${COLUMNS} FROM chat_attachments WHERE ${where} ORDER BY id LIMIT 32`,
        )
        .bind(options.workspaceId, options.workspaceId)
        .all<AttachmentRecord>()
    ).results
  } else {
    where = "(state = 'deleting' OR expires_at <= ?)"
    value = options.now ?? 0
  }
  return (
    await db
      .prepare(
        `SELECT ${COLUMNS} FROM chat_attachments WHERE ${where} AND id > ? ORDER BY id LIMIT 32`,
      )
      .bind(value, options.after ?? '')
      .all<AttachmentRecord>()
  ).results
}

export async function removeAttachmentRecord(db: D1Database, id: string) {
  await db
    .prepare("DELETE FROM chat_attachments WHERE id = ? AND state = 'deleting'")
    .bind(id)
    .run()
}
