import type { AttachmentUploadTarget } from '../../src/shared/messages'
import type { AppEnv } from '../env'
import { warnWorker } from '../warnings'
import { insertAttachment, readAttachment } from './attachment-data'
import { deleteAttachment, removeAttachmentBytes } from './attachment-cleanup'
import {
  ATTACHMENT_DRAFT_MS,
  attachmentNotFound,
  type AttachmentRecord,
} from './attachment-record'

export interface AttachmentStorageInput {
  orgId: string
  uploaderUserId: string
  target: AttachmentUploadTarget
  name: string
  kind: 'image' | 'file'
  mediaType: string
}

export async function createAttachmentRecord(
  env: AppEnv,
  input: AttachmentStorageInput,
  sizeBytes: number,
  dependencies: { now: () => number; newId: () => string },
): Promise<AttachmentRecord> {
  const id = dependencies.newId()
  const now = dependencies.now()
  const record: AttachmentRecord = {
    id,
    orgId: input.orgId,
    uploaderUserId: input.uploaderUserId,
    targetKind: input.target.type,
    targetId:
      input.target.type === 'workspace'
        ? input.target.workspaceId
        : input.target.messageId,
    name: input.name,
    kind: input.kind,
    mediaType: input.mediaType,
    sizeBytes,
    objectKey: `attachments/${encodeURIComponent(input.orgId)}/${encodeURIComponent(id)}`,
    multipartId: null,
    state: 'uploading',
    createdAt: now,
    expiresAt: now + ATTACHMENT_DRAFT_MS,
    claimedWorkspaceId: null,
    claimedMessageId: null,
    transferredSandboxId: null,
    bytesDeletedAt: null,
    revision: 0,
  }
  if (!(await insertAttachment(env.DB, record))) throw attachmentNotFound()
  return record
}

export async function cleanupAttachmentUpload(
  env: AppEnv,
  record: AttachmentRecord,
): Promise<void> {
  try {
    const current = await readAttachment(env.DB, record.id)
    if (current) {
      current.multipartId ??= record.multipartId
      await deleteAttachment(env, current)
    } else await removeAttachmentBytes(env, record)
  } catch {
    warnWorker({ kind: 'attachment_upload_cleanup_retry' })
  }
}
