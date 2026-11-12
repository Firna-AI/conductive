import type {
  AgentListSessionsResponse,
  AgentSessionSummary,
  AgentSessionResponse,
  AgentStopSessionResponse,
  AgentGetMessageResponse,
  AgentReadSessionResponse,
  AgentTranscriptPosition,
} from '../src/shared/agent-sessions.ts'
import { choice, record, text, ToolInputError } from './input.ts'
import {
  array,
  flag,
  messageSender,
  nullableText,
  replyCounter,
  timestamp,
  workspaceSummary,
} from './responses.ts'

function invalid(): never {
  throw new ToolInputError('The session reply is not valid.')
}
function string(value: unknown): string {
  return typeof value === 'string' ? value : invalid()
}
export function listedSessions(value: unknown): AgentListSessionsResponse {
  const fields = record(value)
  return {
    ...(fields.hasMore !== undefined && { hasMore: flag(fields.hasMore) }),
    workspace: workspaceSummary(fields.workspace),
    sessions: array(fields.sessions).map(sessionSummary),
  }
}

function position(value: unknown): AgentTranscriptPosition | null {
  if (value === null) return null
  const fields = record(value)
  return {
    line: replyCounter(fields.line),
    offset: replyCounter(fields.offset),
  }
}

export function readSession(value: unknown): AgentReadSessionResponse {
  const fields = record(value)
  const session = record(fields.session)
  const detail = fields.detail
  if (detail !== 'concise' && detail !== 'full') return invalid()
  return {
    workspace: workspaceSummary(fields.workspace),
    session: { id: text(session.id), link: text(session.link) },
    detail,
    markdown: string(fields.markdown),
    startLine: replyCounter(fields.startLine),
    endLine: replyCounter(fields.endLine),
    totalLines: replyCounter(fields.totalLines),
    startOffset: replyCounter(fields.startOffset),
    endOffset: replyCounter(fields.endOffset),
    next: position(fields.next),
  }
}

function sessionSummary(value: unknown): AgentSessionSummary {
  const item = record(value)
  const state = item.state
  if (state !== 'running' && state !== 'failed' && state !== 'idle')
    return invalid()
  return {
    id: text(item.id),
    link: text(item.link),
    title: nullableText(item.title),
    choice: choice(item.choice),
    startedBy: item.startedBy === null ? null : messageSender(item.startedBy),
    state,
    closed: flag(item.closed),
  }
}

export function sessionResponse(value: unknown): AgentSessionResponse {
  const fields = record(value)
  return {
    workspace: workspaceSummary(fields.workspace),
    session: sessionSummary(fields.session),
  }
}

export function stoppedSession(value: unknown): AgentStopSessionResponse {
  const fields = record(value)
  const state = fields.state
  if (state !== 'idle' && state !== 'stopped' && state !== 'stopping')
    return invalid()
  return {
    ...sessionResponse(fields),
    turnId: fields.turnId === null ? null : text(fields.turnId),
    state,
  }
}

export function gotMessage(value: unknown): AgentGetMessageResponse {
  const fields = record(value)
  const message = record(fields.message)
  const session = record(fields.session)
  const state = message.state
  if (state !== 'queued' && state !== 'sent') return invalid()
  return {
    workspace: workspaceSummary(fields.workspace),
    session: { id: text(session.id), link: text(session.link) },
    message: {
      id: text(message.id),
      sessionId: text(message.sessionId),
      sender: messageSender(message.sender),
      text: string(message.text),
      state,
      createdAt: timestamp(message.createdAt),
    },
    turnId: fields.turnId === null ? null : text(fields.turnId),
  }
}
