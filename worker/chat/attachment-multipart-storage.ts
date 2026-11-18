import type { AttachmentUploadPart } from '../../src/shared/messages'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import {
  beginAttachmentCompletion,
  publishAttachment,
  saveAttachmentMultipart,
} from './attachment-data'
import {
  attachmentBucket,
  attachmentNotFound,
  publicAttachment,
  type AttachmentRecord,
} from './attachment-record'
import {
  cleanupAttachmentUpload,
  createAttachmentRecord,
  type AttachmentStorageInput,
} from './attachment-storage'

export async function startAttachmentUpload(
  env: AppEnv,
  input: AttachmentStorageInput,
  sizeBytes: number,
  dependencies: { now: () => number; newId: () => string },
) {
  const bucket = attachmentBucket(env)
  const record = await createAttachmentRecord(
    env,
    input,
    sizeBytes,
    dependencies,
  )
  try {
    const upload = await bucket.createMultipartUpload(record.objectKey, {
      customMetadata: { attachmentId: record.id, orgId: record.orgId },
    })
    record.multipartId = upload.uploadId
    if (!(await saveAttachmentMultipart(env.DB, record.id, upload.uploadId)))
      throw attachmentNotFound()
    return record.id
  } catch (error) {
    await cleanupAttachmentUpload(env, record)
    throw uploadError(error)
  }
}

export async function completeAttachmentUpload(
  env: AppEnv,
  record: AttachmentRecord,
  parts: readonly AttachmentUploadPart[],
  now: () => number,
) {
  const bucket = attachmentBucket(env)
  if (!record.multipartId || !(await beginAttachmentCompletion(env.DB, record)))
    throw attachmentNotFound()
  record.revision++
  try {
    const object = await bucket
      .resumeMultipartUpload(record.objectKey, record.multipartId)
      .complete([...parts])
    if (object.size !== record.sizeBytes)
      throw new HttpError(
        400,
        'attachment_size_mismatch',
        'The file upload did not finish. Upload it again.',
      )
    if (!(await publishAttachment(env.DB, record, object.size, now())))
      throw attachmentNotFound()
    return publicAttachment(record)
  } catch (error) {
    await cleanupAttachmentUpload(env, record)
    throw uploadError(error)
  }
}

export function uploadError(error: unknown, interrupted = false): HttpError {
  if (error instanceof HttpError) return error
  return new HttpError(
    interrupted ? 400 : 503,
    interrupted ? 'attachment_upload_interrupted' : 'attachment_upload_failed',
    'The file upload did not finish. Try again.',
  )
}
