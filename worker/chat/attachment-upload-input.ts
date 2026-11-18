import {
  ATTACHMENT_PART_BYTES,
  type AttachmentUploadPart,
  type AttachmentUploadTarget,
} from '../../src/shared/messages'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { readAttachment } from './attachment-data'
import { attachmentNotFound } from './attachment-record'
import { counter, identifier, invalidInput, record } from './inputs'
import { findChatWorkspace } from './queries'

function uploadIdentifier(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    throw attachmentNotFound()
  }
}

export async function attachmentUploadTarget(
  env: AppEnv,
  orgId: string,
  workspaceIdSegment: string | null,
  messageId: unknown,
): Promise<AttachmentUploadTarget> {
  if (workspaceIdSegment === null)
    return { type: 'new-workspace', messageId: identifier(messageId) }
  const workspaceId = uploadIdentifier(workspaceIdSegment)
  const workspace = await findChatWorkspace(env.DB, orgId, workspaceId)
  if (!workspace) throw attachmentNotFound()
  if (workspace.archivedAt !== null)
    throw new HttpError(
      409,
      'workspace_archived',
      'The archived chat is read-only.',
    )
  return { type: 'workspace', workspaceId }
}

export function attachmentPartCount(sizeBytes: number): number {
  return Math.max(1, Math.ceil(sizeBytes / ATTACHMENT_PART_BYTES))
}

export async function ownedAttachmentUpload(
  env: AppEnv,
  orgId: string,
  userId: string,
  workspaceIdSegment: string | null,
  uploadIdSegment: string,
  now: number,
) {
  const stored = await readAttachment(env.DB, uploadIdentifier(uploadIdSegment))
  if (
    !stored ||
    stored.orgId !== orgId ||
    stored.uploaderUserId !== userId ||
    stored.state !== 'uploading' ||
    stored.revision !== 0 ||
    stored.multipartId === null ||
    stored.expiresAt <= now ||
    stored.targetKind !==
      (workspaceIdSegment === null ? 'new-workspace' : 'workspace') ||
    (workspaceIdSegment !== null &&
      stored.targetId !== uploadIdentifier(workspaceIdSegment))
  )
    throw attachmentNotFound()
  await attachmentUploadTarget(env, orgId, workspaceIdSegment, stored.targetId)
  return stored
}

export function attachmentReceipts(
  value: unknown,
  sizeBytes: number,
): AttachmentUploadPart[] {
  if (!Array.isArray(value) || value.length !== attachmentPartCount(sizeBytes))
    return invalidInput()
  const parts = value
    .map((item: unknown) => {
      const input = record(item)
      return {
        partNumber: counter(input.partNumber),
        etag: identifier(input.etag),
      }
    })
    .sort((left, right) => left.partNumber - right.partNumber)
  if (parts.some((part, index) => part.partNumber !== index + 1))
    return invalidInput()
  return parts
}
