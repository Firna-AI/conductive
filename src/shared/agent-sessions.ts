import type { Agent, AgentChoice, Effort } from './agents'
import type { MessageSender, UserMessage } from './messages'
import type { Session, TranscriptDetail } from './sessions'
import type { AgentWorkspaceSummary } from './agent-tools'

interface AgentSessionChoiceRequest {
  model?: { agent: Agent; model: string }
  effort?: Effort
  requestId?: string
}

export interface AgentCreateSessionRequest extends AgentSessionChoiceRequest {
  title?: string
  firstMessage?: string
}

export interface AgentSendMessageRequest extends AgentSessionChoiceRequest {
  text: string
}

interface AgentSessionAcceptance {
  session: Session
  eventNumber: number
}

export type AgentSessionAccepted = AgentSessionAcceptance &
  ({ message: null; turnId: null } | { message: UserMessage; turnId: string })

export type AgentSessionResume =
  | { state: 'not_needed' | 'queued' | 'waiting'; error: null }
  | { state: 'failed'; error: { code: string; message: string } }

export type AgentSessionWriteResponse = AgentSessionAccepted & {
  workspace: AgentWorkspaceSummary
  session: Session & { link: string }
  resume: AgentSessionResume
}

export type AgentCreateSessionResponse = AgentSessionWriteResponse
export type AgentSendMessageResponse = Extract<
  AgentSessionWriteResponse,
  { message: UserMessage }
>

export interface AgentSessionSummary {
  id: string
  link: string
  title: string | null
  choice: AgentChoice
  startedBy: MessageSender | null
  state: 'running' | 'failed' | 'idle'
  closed: boolean
}

export interface AgentListSessionsResponse {
  workspace: AgentWorkspaceSummary
  sessions: readonly AgentSessionSummary[]
  hasMore?: boolean
}

/** Offsets count UTF-16 code units within the named one-based line. */
export interface AgentTranscriptPosition {
  line: number
  offset: number
}

export interface AgentReadSessionRequest {
  detail?: TranscriptDetail
  startLine?: number
  startOffset?: number
}

export interface AgentTranscriptWindow {
  markdown: string
  startLine: number
  endLine: number
  totalLines: number
  startOffset: number
  endOffset: number
  next: AgentTranscriptPosition | null
}

export interface AgentReadSessionResponse extends AgentTranscriptWindow {
  workspace: AgentWorkspaceSummary
  session: { id: string; link: string }
  detail: TranscriptDetail
}

/** The serialized reply leaves room below the published tool-result guidance. */
export const AGENT_TRANSCRIPT_MAX_BYTES = 32_000

export interface AgentListSessionsRequest {
  limit?: number
  offset?: number
}

export interface AgentSessionResponse {
  workspace: AgentWorkspaceSummary
  session: AgentSessionSummary
}

export interface AgentRenameSessionRequest {
  title: string
}

export interface AgentCloseSessionRequest {
  stopRunningTurn?: boolean
}

export interface AgentStopSessionResponse extends AgentSessionResponse {
  turnId: string | null
  state: 'idle' | 'stopped' | 'stopping'
}

export interface AgentGetMessageResponse {
  workspace: AgentWorkspaceSummary
  session: { id: string; link: string }
  message: Pick<
    UserMessage,
    'id' | 'sessionId' | 'sender' | 'text' | 'state' | 'createdAt'
  >
  turnId: string | null
}
