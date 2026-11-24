import type { Session } from './generated/Session'
import type { TranscriptDetail } from './generated/TranscriptDetail'
import type { AgentChoice } from './generated/AgentChoice'
import type { SessionAnchor } from './generated/SessionAnchor'

import type { MessageDraft, SendMessageResponse } from './messages'
import { workspacePath } from './workspaces'

export function sessionsPath(orgId: string, workspaceId: string): string {
  return `${workspacePath(orgId, workspaceId)}/sessions`
}
export function sessionPath(
  orgId: string,
  workspaceId: string,
  sessionId: string,
): string {
  return `${sessionsPath(orgId, workspaceId)}/${encodeURIComponent(sessionId)}`
}

export function explainSessionPath(
  orgId: string,
  workspaceId: string,
  parentSessionId: string,
): string {
  return `${sessionPath(orgId, workspaceId, parentSessionId)}/explain`
}

export interface ExplainSessionRequest extends Omit<
  SessionAnchor,
  'parentSessionId'
> {
  choice?: AgentChoice
  /** The member's question at the start of the written prompt. */
  question?: string
  /**
   * The ID that the app chooses for the written prompt. A repeat of the
   * same start with the same ID gives the explanation that it started, so
   * a start whose reply was lost never starts a second explanation.
   */
  promptId?: string
}

export type ExplainSessionResponse = SendMessageResponse

export interface SessionTranscriptResponse {
  markdown: string
}

export function sessionTranscriptPath(
  orgId: string,
  workspaceId: string,
  sessionId: string,
  detail: TranscriptDetail,
): string {
  return `${sessionPath(orgId, workspaceId, sessionId)}/transcript?${new URLSearchParams({ detail })}`
}
export const sessionPaths = {
  messages: (orgId: string, workspaceId: string, sessionId: string) =>
    `${sessionPath(orgId, workspaceId, sessionId)}/messages`,
  close: (orgId: string, workspaceId: string, sessionId: string) =>
    `${sessionPath(orgId, workspaceId, sessionId)}/close`,
  reopen: (orgId: string, workspaceId: string, sessionId: string) =>
    `${sessionPath(orgId, workspaceId, sessionId)}/reopen`,
  interrupt: (orgId: string, workspaceId: string, sessionId: string) =>
    `${sessionPath(orgId, workspaceId, sessionId)}/interrupt`,
  model: (orgId: string, workspaceId: string, sessionId: string) =>
    `${sessionPath(orgId, workspaceId, sessionId)}/model`,
} as const

export function retryMessagePath(
  orgId: string,
  workspaceId: string,
  sessionId: string,
  messageId: string,
): string {
  return `${sessionPaths.messages(orgId, workspaceId, sessionId)}/${encodeURIComponent(messageId)}/retry`
}
export interface SessionsResponse {
  eventNumber: number
  sessions: readonly Session[]
  /** Closed sessions, last closed first. */
  history: readonly Session[]
}
export interface SessionResponse {
  eventNumber: number
  session: Session
}
export interface CreateSessionRequest {
  choice: AgentChoice
}
export interface RenameSessionRequest {
  title: string
}
export interface CloseSessionRequest {
  stopRunningTurn: boolean
}
export interface ChangeModelRequest {
  choice: AgentChoice
  draft: MessageDraft
  /**
   * The ID of the new session when the change opens one. The client chooses it,
   * so that a retry refers to the same session and the draft can move at once.
   */
  newSessionId: string
}
export interface ChangeModelResponse extends SessionResponse {
  created: boolean
  draft: MessageDraft
}
export interface InterruptRequest {
  turnId: string
}
export interface InterruptResponse {
  eventNumber: number
  turnId: string
  state: 'stopping' | 'stopped'
}
