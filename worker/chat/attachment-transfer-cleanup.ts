import type { AppEnv } from '../env'
import { warnWorker } from '../warnings'
import { readAttachment } from './attachment-data'
import { attachmentBucket } from './attachment-record'
import {
  deletableTransferredAttachment,
  markAttachmentBytesDeleted,
  transferredAttachmentBatch,
} from './attachment-transfer-data'
import type { StoredAttachment } from './types'

async function deleteTransferredBytes(env: AppEnv, id: string, now: number) {
  try {
    if (!(await deletableTransferredAttachment(env.DB, id))) return
    const record = await readAttachment(env.DB, id)
    if (!record) return
    await attachmentBucket(env).delete(record.objectKey)
    await markAttachmentBytesDeleted(env.DB, id, now)
  } catch {
    warnWorker({ kind: 'attachment_cleanup_retry' })
  }
}

/** Called outside the chat queue, after its message proof commits. */
export async function finishAttachmentCopies(
  env: AppEnv,
  workspaceId: string,
  attachments: readonly StoredAttachment[],
  sandboxId: string | null,
): Promise<void> {
  if (sandboxId === null) return
  for (const attachment of attachments) {
    try {
      const record = await readAttachment(env.DB, attachment.attachmentId)
      if (
        record?.claimedWorkspaceId === workspaceId &&
        record.transferredSandboxId === sandboxId
      )
        await deleteTransferredBytes(env, record.id, Date.now())
    } catch {
      warnWorker({ kind: 'attachment_cleanup_retry' })
    }
  }
}

export async function cleanupTransferredAttachments(
  env: AppEnv,
  now: number,
): Promise<void> {
  let after = ''
  while (true) {
    const records = await transferredAttachmentBatch(env.DB, after)
    for (const record of records) {
      await deleteTransferredBytes(env, record.id, now)
      after = record.id
    }
    if (records.length < 32) return
  }
}
