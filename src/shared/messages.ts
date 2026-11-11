import type { AgentChoice } from './agents'
import { orgPath, type Timestamp } from './api'
import type { Session } from './sessions'
import { filePaths } from './files'

export const ATTACHMENT_MAX_BYTES = 25_000_000

export type AttachmentUploadTarget =
  | { type: 'workspace'; workspaceId: string }
  | { type: 'new-workspace'; messageId: string }

function draftAttachmentsPath(orgId: string): string {
  return `${orgPath(orgId)}/attachments`
}

export function attachmentUploadPath(
  orgId: string,
  target: AttachmentUploadTarget,
): string {
  return target.type === 'workspace'
    ? filePaths.attachments(orgId, target.workspaceId)
    : draftAttachmentsPath(orgId)
}

export function attachmentUploadUrl(
  orgId: string,
  target: AttachmentUploadTarget,
  metadata: { name: string; mediaType: string },
): string {
  const query = new URLSearchParams(metadata)
  if (target.type === 'new-workspace') query.set('messageId', target.messageId)
  return `${attachmentUploadPath(orgId, target)}?${query}`
}

export interface MessageSender {
  id: string
  githubLogin: string
  displayName: string | null
  avatarUrl: string | null
}

export interface Attachment {
  id: string
  name: string
  kind: 'image' | 'file'
  mediaType: string
  sizeBytes: number
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

export interface UserMessage {
  id: string
  sessionId: string
  sender: MessageSender
  text: string
  attachments: readonly Attachment[]
  choice: AgentChoice
  createdAt: Timestamp
  state: 'queued' | 'sent'
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
