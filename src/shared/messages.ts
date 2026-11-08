import type { AgentChoice } from './agents'
import type { Timestamp } from './api'
import type { Session } from './sessions'

/** Uploads can precede the first message that creates a workspace. */
export const DRAFT_ATTACHMENTS_PATH = '/api/attachments'

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

/** The app gate requires JSON, including writes that carry attachments. */
export interface UploadAttachmentRequest {
  name: string
  kind: 'image' | 'file'
  mediaType: string
  dataBase64: string
}
export interface UploadAttachmentResponse {
  attachment: Attachment
}
