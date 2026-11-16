import { hash, randomToken } from '../security/crypto'

export interface AttachmentDownload {
  attachmentId: string
  workspaceId: string
  orgId: string
  sandboxId: string
  providerAccount: string
}

export async function createAttachmentDownload(
  db: D1Database,
  input: AttachmentDownload,
  now = Date.now(),
): Promise<string> {
  const token = randomToken()
  await db
    .prepare(
      `INSERT INTO attachment_download_tokens
      (digest, attachment_id, workspace_id, org_id, sandbox_id, provider_account, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      await hash(token),
      input.attachmentId,
      input.workspaceId,
      input.orgId,
      input.sandboxId,
      input.providerAccount,
      now + 10 * 60 * 1_000,
    )
    .run()
  return token
}

export function claimAttachmentDownload(
  db: D1Database,
  digest: string,
  now: number,
) {
  return db
    .prepare(
      `UPDATE attachment_download_tokens SET claimed_at = ?
      WHERE digest = ? AND claimed_at IS NULL AND expires_at > ?
      RETURNING attachment_id AS attachmentId, workspace_id AS workspaceId,
        org_id AS orgId, sandbox_id AS sandboxId, provider_account AS providerAccount`,
    )
    .bind(now, digest, now)
    .first<AttachmentDownload>()
}

export async function cleanupAttachmentDownloads(db: D1Database, now: number) {
  await db
    .prepare('DELETE FROM attachment_download_tokens WHERE expires_at <= ?')
    .bind(now)
    .run()
}
