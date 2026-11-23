import type { Session } from '../../shared/generated/Session'
import type { SessionLogin } from '../../shared/generated/SessionLogin'
import type { Agent } from '../../shared/generated/Agent'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { Effort } from '../../shared/generated/Effort'
import type { ToolCall } from '../../shared/generated/ToolCall'
import type { Attachment } from '../../shared/generated/Attachment'
import type { MessageSender } from '../../shared/generated/MessageSender'
import type { UserMessage } from '../../shared/generated/UserMessage'
import type { ChatEvent, RunnerEventRefused } from '../../shared/chat-events'
import type { MessageDraft } from '../../shared/messages'

import { readTurnSpeed } from '../../shared/chat-events'
import { readAnchor } from './read-anchor'
import { readStopRequester } from './read-stop'
import { readCapabilityChangeNote } from './read-capability-change'
import { readChangedFile } from './read-changed-file'
import { readContinued, readRepositoryChanged } from './read-continued'
import { readWatchNotice } from './read-watch-notice'
import {
  count,
  flag,
  list,
  nullable,
  oneOf,
  optional,
  record,
  safeCount,
  text,
  UnreadableResponse,
} from './json'

export const readAgent = oneOf<Agent>({ claude: true, codex: true })
export const readEffort = oneOf<Effort>({
  none: true,
  low: true,
  medium: true,
  high: true,
  xhigh: true,
  max: true,
  ultra: true,
})
const readToolKind = oneOf<ToolCall['kind']>({
  read: true,
  search: true,
  create: true,
  edit: true,
  run: true,
  computer: true,
  other: true,
})
const readToolState = oneOf<ToolCall['state']>({
  running: true,
  done: true,
  stopped: true,
  failed: true,
})
const readRunnerEventType = oneOf<RunnerEventRefused['runnerEventType']>({
  'turn.started': true,
  'turn.thinking': true,
  'assistant.delta': true,
  'assistant.completed': true,
  'tool.updated': true,
  'turn.completed': true,
  'turn.failed': true,
  'files.snapshot': true,
  'files.unavailable': true,
  'files.changed': true,
  'changes.updated': true,
  'ports.updated': true,
  'skills.updated': true,
  'runner.ready': true,
  'start.updated': true,
  'workspace.title': true,
  unknown: true,
})

export function readChoice(value: unknown): AgentChoice {
  const source = record(value, 'choice')
  return {
    agent: readAgent(source.agent),
    model: text(source.model),
    effort: readEffort(source.effort),
    fast: source.fast === true,
  }
}

export function readSender(value: unknown): MessageSender {
  const source = record(value, 'sender')
  return {
    id: text(source.id),
    githubLogin: text(source.githubLogin),
    displayName: nullable(text)(source.displayName),
    avatarUrl: nullable(text)(source.avatarUrl),
  }
}

export function readAttachment(value: unknown): Attachment {
  const source = record(value, 'attachment')
  return {
    id: text(source.id),
    name: text(source.name),
    path: nullable(text)(source.path ?? null),
    kind: oneOf<Attachment['kind']>({ image: true, file: true })(source.kind),
    mediaType: text(source.mediaType),
    sizeBytes: count(source.sizeBytes),
  }
}

export function readUserMessage(value: unknown): UserMessage {
  const source = record(value, 'message')
  return {
    id: text(source.id),
    sessionId: text(source.sessionId),
    sender: readSender(source.sender),
    text: text(source.text),
    attachments: list(readAttachment)(source.attachments),
    choice: readChoice(source.choice),
    createdAt: count(source.createdAt),
    state: oneOf<UserMessage['state']>({ queued: true, sent: true })(
      source.state,
    ),
  }
}

export function readDraft(value: unknown): MessageDraft {
  const source = record(value, 'draft')
  return {
    text: text(source.text),
    attachmentIds: list(text)(source.attachmentIds),
  }
}

const readLoginType = oneOf<SessionLogin['type']>({ personal: true, org: true })

/** The owner of the login of a session: a member, or the org. */
export function readSessionLogin(value: unknown): SessionLogin {
  const source = record(value, 'session login')
  return readLoginType(source.type) === 'org'
    ? { type: 'org', orgId: text(source.orgId) }
    : { type: 'personal', userId: text(source.userId) }
}

/**
 * A session record. An empty session and an older record have no `login`,
 * so the record then has none either. An empty session names the default
 * login of its starter as `defaultLogin`, which its first message takes,
 * while a login serves that starter. An older record names none.
 */
export function readSession(value: unknown): Session {
  const source = record(value, 'session')
  const login = optional(nullable(readSessionLogin))(source.login)
  const defaultLogin = optional(nullable(readSessionLogin))(source.defaultLogin)
  const anchor = readAnchor(source.anchor)
  return {
    id: text(source.id),
    workspaceId: text(source.workspaceId),
    title: nullable(text)(source.title),
    choice: readChoice(source.choice),
    createdAt: count(source.createdAt),
    closedAt: nullable(count)(source.closedAt),
    activeTurnId: nullable(text)(source.activeTurnId),
    activeTurnStartedAt: nullable(count)(source.activeTurnStartedAt),
    retryMessageId: nullable(text)(source.retryMessageId),
    startedBy: nullable(readSender)(source.startedBy),
    ...(login === undefined ? {} : { login }),
    ...(defaultLogin === undefined ? {} : { defaultLogin }),
    ...(anchor === null ? {} : { anchor }),
    sourceSessionId: nullable(text)(source.sourceSessionId),
    loginAvailable: flag(source.loginAvailable),
    loginShared: flag(source.loginShared),
  }
}

function readTool(value: unknown): ToolCall {
  const source = record(value, 'tool')
  return {
    id: text(source.id),
    kind: readToolKind(source.kind),
    target: text(source.target),
    detail: nullable(text)(source.detail),
    omittedDetailBytes: safeCount(source.omittedDetailBytes),
    state: readToolState(source.state),
  }
}

function readError(value: unknown): { code: string; message: string } {
  const source = record(value, 'error')
  return { code: text(source.code), message: text(source.message) }
}

/** Reads one chat event. A type that this app does not know yet throws. */
export function readChatEvent(source: Record<string, unknown>): ChatEvent {
  switch (source.type) {
    case 'workspace.continued':
      return readContinued(source)
    case 'workspace.repository-changed':
      return readRepositoryChanged(source)
    case 'capabilities.changed':
      return readCapabilityChangeNote(source)
    case 'session.watch-notice':
      return readWatchNotice(source)
    case 'message.accepted':
      return { type: source.type, message: readUserMessage(source.message) }
    case 'message.sent':
      return {
        type: source.type,
        sessionId: text(source.sessionId),
        messageId: text(source.messageId),
        turnId: text(source.turnId),
      }
    case 'session.updated':
      return { type: source.type, session: readSession(source.session) }
    case 'runner.event-refused': {
      const runnerEventNumber = safeCount(source.runnerEventNumber)
      if (runnerEventNumber === 0)
        throw new UnreadableResponse('runner event number')
      return {
        type: source.type,
        streamId: text(source.streamId),
        runnerEventNumber,
        runnerEventType: readRunnerEventType(source.runnerEventType),
        reason: oneOf<RunnerEventRefused['reason']>({
          too_large: true,
          invalid: true,
          turn_not_active: true,
        })(source.reason),
        sessionId: nullable(text)(source.sessionId),
        turnId: nullable(text)(source.turnId),
      }
    }
  }
  const turn = {
    sessionId: text(source.sessionId),
    turnId: text(source.turnId),
  }
  switch (source.type) {
    case 'turn.started':
      return {
        ...turn,
        type: source.type,
        senderId: text(source.senderId),
        choice: readChoice(source.choice),
        startedAt: count(source.startedAt),
        messageIds: list(text)(source.messageIds),
      }
    case 'turn.thinking':
      return { ...turn, type: source.type }
    case 'assistant.delta':
      return {
        ...turn,
        type: source.type,
        messageId: text(source.messageId),
        text: text(source.text),
      }
    case 'assistant.completed':
      return {
        ...turn,
        type: source.type,
        messageId: text(source.messageId),
        text: text(source.text),
        userMessageIds: list(text)(source.userMessageIds),
      }
    case 'tool.updated':
      return { ...turn, type: source.type, tool: readTool(source.tool) }
    case 'turn.completed': {
      // An end with no speed, or with a speed that it cannot read, has none.
      const speed = readTurnSpeed(source.speed)
      return {
        ...turn,
        type: source.type,
        state: oneOf({ finished: true, stopped: true })(source.state),
        durationMs: count(source.durationMs),
        ...(source.endReason === 'background_work_limit'
          ? { endReason: source.endReason }
          : {}),
        ...(speed === undefined ? {} : { speed }),
        files: list(readChangedFile)(source.files),
        // Only the value true marks files that the runner could not read.
        ...(source.filesUnavailable === true ? { filesUnavailable: true } : {}),
        omittedFileCount: safeCount(source.omittedFileCount),
        userMessageIds: list(text)(source.userMessageIds),
      }
    }
    case 'turn.failed':
      return {
        ...turn,
        type: source.type,
        error: readError(source.error),
        retryMessageId: text(source.retryMessageId),
        durationMs: count(source.durationMs),
      }
    case 'turn.stop-requested':
      return { ...turn, type: source.type, ...readStopRequester(source) }
  }
  throw new UnreadableResponse('type')
}
