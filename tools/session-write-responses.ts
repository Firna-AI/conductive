import type {
  AgentCreateSessionResponse,
  AgentSendMessageResponse,
  AgentSessionResume,
} from '../src/shared/agent-sessions.ts'
import type { UserMessage } from '../src/shared/messages.ts'
import type { Session } from '../src/shared/sessions.ts'
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

function session(value: unknown): Session & { link: string } {
  const fields = record(value)
  return {
    id: text(fields.id),
    workspaceId: text(fields.workspaceId),
    link: text(fields.link),
    title: nullableText(fields.title),
    choice: choice(fields.choice),
    createdAt: timestamp(fields.createdAt),
    closedAt: fields.closedAt === null ? null : timestamp(fields.closedAt),
    activeTurnId: nullableText(fields.activeTurnId),
    activeTurnStartedAt:
      fields.activeTurnStartedAt === null
        ? null
        : timestamp(fields.activeTurnStartedAt),
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
    createdAt: timestamp(fields.createdAt),
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
        sizeBytes: replyCounter(item.sizeBytes),
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
    workspace: workspaceSummary(fields.workspace),
    session: session(fields.session),
    eventNumber: replyCounter(fields.eventNumber),
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
