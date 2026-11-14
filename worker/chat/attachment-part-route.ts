import {
  ATTACHMENT_PART_BYTES,
  type AttachmentUploadPart,
} from '../../src/shared/messages'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { fixedUploadBody } from '../http/fixed-upload-body'
import type { RawUploadRoute } from '../http/raw-upload-routes'
import { gate } from '../security/gate'
import { attachmentBucket, attachmentNotFound } from './attachment-record'
import { uploadError } from './attachment-multipart-storage'
import {
  attachmentPartCount,
  ownedAttachmentUpload,
} from './attachment-upload-input'

export async function attachmentPartRoute(
  request: Request,
  env: AppEnv,
  route: Extract<RawUploadRoute, { kind: 'part' }>,
  now: () => number,
): Promise<Response> {
  const context = await gate(request, env, now())
  if (!context.org || context.rawUploadBytes === undefined)
    throw attachmentNotFound()
  const record = await ownedAttachmentUpload(
    env,
    context.org.id,
    context.user.id,
    route.workspaceIdSegment,
    route.uploadIdSegment,
    now(),
  )
  const partNumber = Number(route.partNumberSegment)
  if (
    !/^[1-9][0-9]*$/.test(route.partNumberSegment) ||
    !Number.isSafeInteger(partNumber) ||
    partNumber > attachmentPartCount(record.sizeBytes)
  )
    throw new HttpError(
      400,
      'attachment_part_invalid',
      'The file upload did not finish. Try again.',
    )
  const expectedLength = Math.min(
    ATTACHMENT_PART_BYTES,
    record.sizeBytes - (partNumber - 1) * ATTACHMENT_PART_BYTES,
  )
  if (context.rawUploadBytes !== expectedLength)
    throw new HttpError(
      400,
      'attachment_part_size_mismatch',
      'The file upload did not finish. Try again.',
    )
  if (!record.multipartId) throw attachmentNotFound()
  const transfer = fixedUploadBody(request, expectedLength)
  try {
    if (expectedLength === 0) await transfer.finished
    const part = await attachmentBucket(env)
      .resumeMultipartUpload(record.objectKey, record.multipartId)
      .uploadPart(partNumber, transfer.body)
    await transfer.finished
    return Response.json(part satisfies AttachmentUploadPart)
  } catch (error) {
    const interrupted = transfer.failed()
    await transfer.cancel(error)
    throw uploadError(error, interrupted)
  }
}
