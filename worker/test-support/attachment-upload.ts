import {
  ATTACHMENT_PART_BYTES,
  type AttachmentUploadPart,
} from '../../src/shared/messages'
import type { AppEnv } from '../env'
import { readAttachment } from '../chat/attachment-data'
import {
  completeAttachmentUpload,
  startAttachmentUpload,
} from '../chat/attachment-multipart-storage'
import { attachmentBucket } from '../chat/attachment-record'
import type { AttachmentStorageInput } from '../chat/attachment-storage'

export async function uploadAttachment(
  env: AppEnv,
  input: AttachmentStorageInput,
  bytes: Uint8Array,
  dependencies: { now: () => number; newId: () => string },
) {
  const id = await startAttachmentUpload(
    env,
    input,
    bytes.byteLength,
    dependencies,
  )
  const record = await readAttachment(env.DB, id)
  if (!record?.multipartId) throw new Error('The upload is missing.')
  const upload = attachmentBucket(env).resumeMultipartUpload(
    record.objectKey,
    record.multipartId,
  )
  const parts: AttachmentUploadPart[] = []
  const count = Math.max(1, Math.ceil(bytes.byteLength / ATTACHMENT_PART_BYTES))
  for (let index = 0; index < count; index++) {
    const offset = index * ATTACHMENT_PART_BYTES
    parts.push(
      await upload.uploadPart(
        index + 1,
        bytes.subarray(offset, offset + ATTACHMENT_PART_BYTES),
      ),
    )
  }
  return completeAttachmentUpload(env, record, parts, dependencies.now)
}
