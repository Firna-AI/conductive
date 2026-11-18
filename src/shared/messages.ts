import type { Session } from './generated/Session'
import type { AgentChoice } from './generated/AgentChoice'
import type { UserMessage } from './generated/UserMessage'
import type { Attachment } from './generated/Attachment'
import { orgPath } from './api'

import { filePaths } from './files'

export const ATTACHMENT_MAX_BYTES = 1_000_000_000
export const ATTACHMENT_PART_BYTES = 67_108_864

export type AttachmentUploadTarget =
  | { type: 'workspace'; workspaceId: string }
  | { type: 'new-workspace'; messageId: string }

function draftAttachmentsPath(orgId: string): string {
  return `${orgPath(orgId)}/attachments`
}

function attachmentUploadPath(
  orgId: string,
  target: AttachmentUploadTarget,
): string {
  return target.type === 'workspace'
    ? filePaths.attachments(orgId, target.workspaceId)
    : draftAttachmentsPath(orgId)
}

export function attachmentUploadStartPath(
  orgId: string,
  target: AttachmentUploadTarget,
): string {
  return `${attachmentUploadPath(orgId, target)}/uploads`
}

export function attachmentUploadPartPath(
  orgId: string,
  target: AttachmentUploadTarget,
  uploadId: string,
  partNumber: number,
): string {
  return `${attachmentUploadStartPath(orgId, target)}/${encodeURIComponent(uploadId)}/parts/${partNumber}`
}

export function attachmentUploadCompletePath(
  orgId: string,
  target: AttachmentUploadTarget,
  uploadId: string,
): string {
  return `${attachmentUploadStartPath(orgId, target)}/${encodeURIComponent(uploadId)}/complete`
}

export interface StartAttachmentUploadRequest {
  name: string
  mediaType: string
  sizeBytes: number
  messageId?: string
}

export interface StartAttachmentUploadResponse {
  uploadId: string
  partSizeBytes: number
  partCount: number
}

export interface AttachmentUploadPart {
  partNumber: number
  etag: string
}

export interface CompleteAttachmentUploadRequest {
  parts: readonly AttachmentUploadPart[]
}

export interface MessageDraft {
  text: string
  attachmentIds: readonly string[]
}

export interface SendMessageRequest extends MessageDraft {
  /** A stable client ID lets a retry refer to the same message. */
  id: string
  choice: AgentChoice
}

export interface SendMessageResponse {
  eventNumber: number
  message: UserMessage
  turnId: string | null
  session: Session
}

export interface UploadAttachmentResponse {
  attachment: Attachment
}
