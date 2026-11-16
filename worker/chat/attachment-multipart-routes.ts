import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_PART_BYTES,
  type CompleteAttachmentUploadRequest,
  type StartAttachmentUploadRequest,
  type StartAttachmentUploadResponse,
  type UploadAttachmentResponse,
} from '../../src/shared/messages'
import type { AppEnv } from '../env'
import { gate } from '../security/gate'
import { attachmentNotFound, attachmentTooLarge } from './attachment-record'
import {
  completeAttachmentUpload,
  startAttachmentUpload,
} from './attachment-multipart-storage'
import {
  attachmentPartCount,
  attachmentReceipts,
  attachmentUploadTarget,
  ownedAttachmentUpload,
} from './attachment-upload-input'
import { counter, identifier, number } from './inputs'

const UPLOAD_PATH =
  /^\/api\/orgs\/[^/]+\/(?:workspaces\/([^/]+)\/)?attachments\/uploads(?:\/([^/]+)\/complete)?$/

export async function attachmentMultipartRoute(
  request: Request,
  env: AppEnv,
  now: () => number,
  newId: () => string,
): Promise<Response | null> {
  if (request.method !== 'POST') return null
  const match = new URL(request.url).pathname.match(UPLOAD_PATH)
  if (!match) return null
  const context = await gate(request, env, now())
  if (!context.org || !context.body) throw attachmentNotFound()
  const workspaceIdSegment = match[1] ?? null
  if (match[2]) {
    const record = await ownedAttachmentUpload(
      env,
      context.org.id,
      context.user.id,
      workspaceIdSegment,
      match[2],
      now(),
    )
    const complete: CompleteAttachmentUploadRequest = {
      parts: attachmentReceipts(context.body.parts, record.sizeBytes),
    }
    const attachment = await completeAttachmentUpload(
      env,
      record,
      complete.parts,
      now,
    )
    return Response.json({ attachment } satisfies UploadAttachmentResponse, {
      status: 201,
    })
  }
  if (number(context.body.sizeBytes) > ATTACHMENT_MAX_BYTES)
    throw attachmentTooLarge()
  const input: StartAttachmentUploadRequest = {
    name: identifier(context.body.name),
    mediaType: identifier(context.body.mediaType),
    sizeBytes: counter(context.body.sizeBytes),
  }
  const target = await attachmentUploadTarget(
    env,
    context.org.id,
    workspaceIdSegment,
    context.body.messageId,
  )
  const uploadId = await startAttachmentUpload(
    env,
    {
      orgId: context.org.id,
      uploaderUserId: context.user.id,
      target,
      name: input.name,
      mediaType: input.mediaType,
      kind: input.mediaType.startsWith('image/') ? 'image' : 'file',
    },
    input.sizeBytes,
    { now, newId },
  )
  return Response.json(
    {
      uploadId,
      partSizeBytes: ATTACHMENT_PART_BYTES,
      partCount: attachmentPartCount(input.sizeBytes),
    } satisfies StartAttachmentUploadResponse,
    { status: 201 },
  )
}
