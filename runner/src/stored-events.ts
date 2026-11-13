import type { ToolCall } from '../../src/shared/generated/ToolCall'
import type { ChangedFile } from '../../src/shared/generated/ChangedFile'
import type { FileEntry } from '../../src/shared/generated/FileEntry'
import type { FileTreeChange } from '../../src/shared/generated/FileTreeChange'
import type { RunnerEvent } from '../../src/shared/generated/RunnerEvent'
import type { RunnerEventEnvelope } from '../../src/shared/generated/RunnerEventEnvelope'
import type { WorkspaceStart } from '../../src/shared/generated/WorkspaceStart'
import type { ListeningPort } from '../../src/shared/generated/ListeningPort'
import { PORT_REPORT_MAX_PORTS } from '../../src/shared/ports'
import { readTurnSpeed } from '../../src/shared/chat-events'
import { parseChoice } from './commands'
import {
  array,
  boolean,
  integer,
  nullable,
  object,
  oneOf,
  string,
} from './parse'

const changes = [
  'added',
  'modified',
  'deleted',
  'renamed',
  'untracked',
] as const

function entry(value: unknown): FileEntry {
  const input = object(value)
  return {
    path: string(input.path),
    ...(typeof input.displayPath === 'string'
      ? { displayPath: input.displayPath }
      : {}),
    name: string(input.name),
    kind: oneOf(input.kind, ['file', 'directory']),
    change: input.change === null ? null : oneOf(input.change, changes),
  }
}

function changed(value: unknown): ChangedFile {
  const input = object(value)
  return {
    path: string(input.path),
    ...(typeof input.displayPath === 'string'
      ? { displayPath: input.displayPath }
      : {}),
    change: oneOf(input.change, changes),
    added: integer(input.added),
    removed: integer(input.removed),
    ...(typeof input.previousDisplayPath === 'string'
      ? { previousDisplayPath: input.previousDisplayPath }
      : {}),
    ...(input.previousPath === undefined
      ? {}
      : { previousPath: string(input.previousPath) }),
  }
}

function delta(value: unknown): FileTreeChange {
  const input = object(value)
  if (input.operation === 'remove')
    return { operation: 'remove', path: string(input.path) }
  if (input.operation === 'move')
    return {
      operation: 'move',
      previousPath: string(input.previousPath),
      entry: entry(input.entry),
    }
  if (input.operation === 'upsert')
    return { operation: 'upsert', entry: entry(input.entry) }
  throw new Error('The saved file change is not supported.')
}

function tool(value: unknown): ToolCall {
  const input = object(value)
  return {
    id: string(input.id),
    kind: oneOf(input.kind, [
      'read',
      'search',
      'create',
      'edit',
      'run',
      'computer',
      'other',
    ]),
    target: string(input.target),
    detail: nullable(input.detail),
    omittedDetailBytes: integer(input.omittedDetailBytes),
    state: oneOf(input.state, ['running', 'done', 'stopped', 'failed']),
  }
}

function start(value: unknown): WorkspaceStart {
  const input = object(value)
  return {
    kind: oneOf(input.kind, ['create', 'resume']),
    startedAt: integer(input.startedAt),
    steps: array(input.steps, (value) => {
      const step = object(value)
      return {
        id: string(step.id),
        label: string(step.label),
        state: oneOf(step.state, ['running', 'completed', 'failed']),
        startedAt: integer(step.startedAt),
        completedAt:
          step.completedAt === null ? null : integer(step.completedAt),
      }
    }),
  }
}

function port(value: unknown): ListeningPort {
  const input = object(value)
  const port = integer(input.port)
  const name = nullable(input.name)
  const folder = nullable(input.folder)
  if (port < 1 || port > 65535)
    throw new Error('The saved listening port exceeds its limits.')
  return { port, name, folder }
}

export function parseEvent(value: unknown): RunnerEvent {
  const input = object(value)
  const type = string(input.type)
  if (type === 'runner.ready') return { type }
  if (type === 'files.unavailable') return { type }
  if (type === 'workspace.title') return { type, name: string(input.name) }
  if (type === 'start.updated') return { type, start: start(input.start) }
  if (type === 'ports.updated') {
    const ports = array(input.ports, port)
    if (ports.length > PORT_REPORT_MAX_PORTS)
      throw new Error('The saved listening ports exceed their limit.')
    return { type, ports }
  }
  if (type === 'files.snapshot') {
    const tree = object(input.tree)
    return {
      type,
      tree: {
        revision: integer(tree.revision),
        partNumber: integer(tree.partNumber),
        partCount: integer(tree.partCount),
        entries: array(tree.entries, entry),
      },
    }
  }
  if (type === 'files.changed') {
    const update = object(input.delta)
    return {
      type,
      delta: {
        revision: integer(update.revision),
        changes: array(update.changes, delta),
      },
    }
  }
  if (type === 'changes.updated') {
    const update = object(input.changes)
    const summary = object(update.summary)
    return {
      type,
      changes: {
        revision: integer(update.revision),
        partNumber: integer(update.partNumber),
        partCount: integer(update.partCount),
        baseBranch: string(update.baseBranch),
        ...(update.unpushedCommits === undefined
          ? {}
          : { unpushedCommits: integer(update.unpushedCommits) }),
        ...(update.uncommittedFileCount === undefined
          ? {}
          : { uncommittedFileCount: integer(update.uncommittedFileCount) }),
        ...(typeof update.displayBaseBranch === 'string'
          ? { displayBaseBranch: update.displayBaseBranch }
          : {}),
        files: array(update.files, (value) => ({
          ...changed(value),
          uncommitted: boolean(object(value).uncommitted),
        })),
        summary: {
          files: integer(summary.files),
          added: integer(summary.added),
          removed: integer(summary.removed),
        },
      },
    }
  }
  const context = {
    sessionId: string(input.sessionId),
    turnId: string(input.turnId),
  }
  if (type === 'turn.thinking') return { type, ...context }
  if (type === 'turn.started')
    return {
      type,
      ...context,
      senderId: string(input.senderId),
      choice: parseChoice(input.choice),
      startedAt: integer(input.startedAt),
      messageIds: array(input.messageIds, string),
    }
  if (type === 'assistant.delta')
    return {
      type,
      ...context,
      messageId: string(input.messageId),
      text: string(input.text),
    }
  if (type === 'assistant.completed')
    return {
      type,
      ...context,
      messageId: string(input.messageId),
      text: string(input.text),
      userMessageIds: array(input.userMessageIds, string),
    }
  if (type === 'tool.updated')
    return { type, ...context, tool: tool(input.tool) }
  if (type === 'turn.completed')
    return {
      type,
      ...context,
      state: oneOf(input.state, ['finished', 'stopped']),
      durationMs: integer(input.durationMs),
      ...(input.endReason === 'background_work_limit'
        ? { endReason: input.endReason }
        : {}),
      ...(input.speed === undefined
        ? {}
        : { speed: readTurnSpeed(input.speed) }),
      files: array(input.files, changed),
      ...(input.filesUnavailable === true ? { filesUnavailable: true } : {}),
      omittedFileCount: integer(input.omittedFileCount),
      userMessageIds: array(input.userMessageIds, string),
    }
  if (type === 'turn.failed') {
    const error = object(input.error)
    return {
      type,
      ...context,
      error: { code: string(error.code), message: string(error.message) },
      retryMessageId: string(input.retryMessageId),
      durationMs: integer(input.durationMs),
    }
  }
  throw new Error('The saved runner event is not supported.')
}

export function parseEnvelope(value: unknown): RunnerEventEnvelope {
  const input = object(value)
  if (input.type !== 'event')
    throw new Error('Expected a saved event envelope.')
  return {
    type: 'event',
    streamId: string(input.streamId),
    eventNumber: integer(input.eventNumber),
    occurredAt: integer(input.occurredAt),
    event: parseEvent(input.event),
  }
}
