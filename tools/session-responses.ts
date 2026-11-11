import type {
  AgentCreateSessionResponse,
  AgentSendMessageResponse,
  AgentListSessionsResponse,
  AgentReadSessionResponse,
  AgentTranscriptPosition,
  AgentWorkspaceSummary,
  AgentSessionResume,
} from '../src/shared/agent-tools.ts'
import type { UserMessage } from '../src/shared/messages.ts'
import type { Session } from '../src/shared/sessions.ts'
import { choice, record, text, ToolInputError } from './input.ts'
import { messageSender, workspaceState } from './responses.ts'

function invalid(): never {
  throw new ToolInputError('The session reply is not valid.')
}
function string(value: unknown): string {
  return typeof value === 'string' ? value : invalid()
}
function nullableText(value: unknown): string | null {
  return value === null ? null : string(value)
}
function number(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : invalid()
}
function counter(value: unknown): number {
  const result = number(value)
  return Number.isSafeInteger(result) && result >= 0 ? result : invalid()
}
function flag(value: unknown): boolean {
  return typeof value === 'boolean' ? value : invalid()
}
function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : invalid()
}

function workspace(value: unknown): AgentWorkspaceSummary {
  const fields = record(value)
  return {
    id: text(fields.id),
    number: counter(fields.number),
    link: text(fields.link),
    name: nullableText(fields.name),
    branch: text(fields.branch),
    state: workspaceState(fields.state),
  }
}

export function listedSessions(value: unknown): AgentListSessionsResponse {
  const fields = record(value)
  return {
    workspace: workspace(fields.workspace),
    sessions: array(fields.sessions).map((value) => {
      const item = record(value)
      const state = item.state
      if (state !== 'running' && state !== 'failed' && state !== 'idle')
        return invalid()
      return {
        id: text(item.id),
        link: text(item.link),
        title: nullableText(item.title),
        choice: choice(item.choice),
        startedBy:
          item.startedBy === null ? null : messageSender(item.startedBy),
        state,
        closed: flag(item.closed),
      }
    }),
  }
}

function position(value: unknown): AgentTranscriptPosition | null {
  if (value === null) return null
  const fields = record(value)
  return { line: counter(fields.line), offset: counter(fields.offset) }
}

export function readSession(value: unknown): AgentReadSessionResponse {
  const fields = record(value)
  const session = record(fields.session)
  const detail = fields.detail
  if (detail !== 'concise' && detail !== 'full') return invalid()
  return {
    workspace: workspace(fields.workspace),
    session: { id: text(session.id), link: text(session.link) },
    detail,
    markdown: string(fields.markdown),
    startLine: counter(fields.startLine),
    endLine: counter(fields.endLine),
    totalLines: counter(fields.totalLines),
    startOffset: counter(fields.startOffset),
    endOffset: counter(fields.endOffset),
    next: position(fields.next),
  }
}

function session(value: unknown): Session & { link: string } {
  const fields = record(value)
  return {
    id: text(fields.id),
    workspaceId: text(fields.workspaceId),
    link: text(fields.link),
    title: nullableText(fields.title),
    choice: choice(fields.choice),
    createdAt: number(fields.createdAt),
    closedAt: fields.closedAt === null ? null : number(fields.closedAt),
    activeTurnId: nullableText(fields.activeTurnId),
    activeTurnStartedAt:
      fields.activeTurnStartedAt === null
        ? null
        : number(fields.activeTurnStartedAt),
    retryMessageId: nullableText(fields.retryMessageId),
    startedBy:
      fields.startedBy === null ? null : messageSender(fields.startedBy),
    sourceSessionId: nullableText(fields.sourceSessionId),
    loginAvailable: flag(fields.loginAvailable),
    loginShared: flag(fields.loginShared),
  }
}

function message(value: unknown): UserMessage {
  const fields = record(value)
  const state = fields.state
  if (state !== 'queued' && state !== 'sent') return invalid()
  return {
    id: text(fields.id),
    sessionId: text(fields.sessionId),
    sender: messageSender(fields.sender),
    text: string(fields.text),
    choice: choice(fields.choice),
    createdAt: number(fields.createdAt),
    state,
    attachments: array(fields.attachments).map((value) => {
      const item = record(value)
      const kind = item.kind
      if (kind !== 'image' && kind !== 'file') return invalid()
      return {
        id: text(item.id),
        name: string(item.name),
        kind,
        mediaType: text(item.mediaType),
        sizeBytes: counter(item.sizeBytes),
      }
    }),
  }
}

function resume(value: unknown): AgentSessionResume {
  const fields = record(value)
  const state = fields.state
  if (state === 'failed') {
    const error = record(fields.error)
    return {
      state,
      error: { code: text(error.code), message: string(error.message) },
    }
  }
  if (
    (state === 'not_needed' || state === 'queued' || state === 'waiting') &&
    fields.error === null
  )
    return { state, error: null }
  return invalid()
}

export function createdSession(value: unknown): AgentCreateSessionResponse {
  const fields = record(value)
  const base = {
    workspace: workspace(fields.workspace),
    session: session(fields.session),
    eventNumber: counter(fields.eventNumber),
    resume: resume(fields.resume),
  }
  if (fields.message === null && fields.turnId === null)
    return { ...base, message: null, turnId: null }
  if (fields.message === null || fields.turnId === null) return invalid()
  return {
    ...base,
    message: message(fields.message),
    turnId: text(fields.turnId),
  }
}

export function sentMessage(value: unknown): AgentSendMessageResponse {
  const result = createdSession(value)
  return result.message === null ? invalid() : result
}
