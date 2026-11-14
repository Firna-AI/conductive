import type {
  Attachment,
  AttachmentUploadTarget,
} from '../../src/shared/messages'
import type { AppEnv } from '../env'
import { randomToken } from '../security/crypto'
import { warnWorker } from '../warnings'
import {
  insertAttachment,
  publishAttachment,
  readAttachment,
  saveAttachmentMultipart,
} from './attachment-data'
import { deleteAttachment, removeAttachmentBytes } from './attachment-cleanup'
import { writeAttachmentObject } from './attachment-byte-storage'
import {
  ATTACHMENT_DRAFT_MS,
  attachmentBucket,
  attachmentNotFound,
  publicAttachment,
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

/** Internal boundary. A browser adapter must authenticate metadata before calling it. */
export async function storeAttachment(
  env: AppEnv,
  input: AttachmentStorageInput,
  source: Uint8Array | ReadableStream<Uint8Array>,
  dependencies: {
    now: () => number
    newId: () => string
    byteLength?: number
    bodyComplete?: Promise<void>
  } = {
    now: Date.now,
    newId: randomToken,
  },
): Promise<Attachment> {
  const bucket = attachmentBucket(env)
  const record = await createAttachmentRecord(env, input, 0, dependencies)
  try {
    record.sizeBytes = await writeAttachmentObject(
      bucket,
      record.objectKey,
      { attachmentId: record.id, orgId: input.orgId },
      source,
      async (multipartId) => {
        record.multipartId = multipartId
        if (!(await saveAttachmentMultipart(env.DB, record.id, multipartId)))
          throw attachmentNotFound()
      },
      dependencies.byteLength,
    )
    await dependencies.bodyComplete
    if (
      !(await publishAttachment(
        env.DB,
        record,
        record.sizeBytes,
        dependencies.now(),
      ))
    )
      throw attachmentNotFound()
    return publicAttachment(record)
  } catch (error) {
    await cleanupAttachmentUpload(env, record)
    throw error
  }
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
