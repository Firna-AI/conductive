import type {
  ChatEvent,
  RunnerEventRefused,
  ToolCall,
} from '../../shared/chat-events'
import type { ChangedFile, ChangeKind } from '../../shared/files'
import {
  count,
  list,
  nullable,
  oneOf,
  optional,
  record,
  text,
  UnreadableResponse,
} from './json'
import { readChoice, readSession, readUserMessage } from './read-chat'
import { readContinued } from './read-continued'

const readChange = oneOf<ChangeKind>({
  added: true,
  modified: true,
  deleted: true,
  renamed: true,
  untracked: true,
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
  'runner.ready': true,
  'start.updated': true,
  'workspace.title': true,
  unknown: true,
})

/** The new count fields require whole, non-negative, safe integer values. */
function safeCount(value: unknown): number {
  const result = count(value)
  if (!Number.isSafeInteger(result) || result < 0)
    throw new UnreadableResponse('count')
  return result
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

/** A display label, or nothing. A label never makes an event unreadable. */
function label(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

/**
 * A file that a turn changed. `path` stays the real path that opens its
 * diff, and `displayPath` is the label that hides a secret value.
 */
function readChangedFile(value: unknown): ChangedFile {
  const source = record(value, 'file')
  const displayPath = label(source.displayPath)
  const previousPath = optional(text)(source.previousPath)
  const previousDisplayPath = label(source.previousDisplayPath)
  return {
    path: text(source.path),
    ...(displayPath === undefined ? {} : { displayPath }),
    ...(previousPath === undefined ? {} : { previousPath }),
    ...(previousPath === undefined || previousDisplayPath === undefined
      ? {}
      : { previousDisplayPath }),
    change: readChange(source.change),
    added: count(source.added),
    removed: count(source.removed),
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
    case 'turn.completed':
      return {
        ...turn,
        type: source.type,
        state: oneOf({ finished: true, stopped: true })(source.state),
        durationMs: count(source.durationMs),
        files: list(readChangedFile)(source.files),
        // Only the value true marks files that the runner could not read.
        ...(source.filesUnavailable === true ? { filesUnavailable: true } : {}),
        omittedFileCount: safeCount(source.omittedFileCount),
        userMessageIds: list(text)(source.userMessageIds),
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
      return {
        ...turn,
        type: source.type,
        requestedById: text(source.requestedById),
      }
  }
  throw new UnreadableResponse('type')
}
