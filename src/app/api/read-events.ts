import type { Workspace, WorkspaceStart } from '../../shared/workspaces'
import {
  count,
  items,
  nested,
  ParseError,
  record,
  text,
  type JsonObject,
} from './parse'
import { readStart, readWorkspace } from './read-workspaces'

/** The events of a workspace that the shell itself draws. */
export type ShellEvent =
  | { type: 'workspace.updated'; workspace: Workspace }
  | { type: 'start.updated'; start: WorkspaceStart }
  | { type: 'workspace.title'; name: string }

/**
 * One numbered event of the stream. `event` keeps the raw payload, so that
 * the chat, the files, and the banner read their own events. `shell` holds
 * the event when the shell draws it.
 */
export interface StreamEnvelope {
  workspaceId: string
  eventNumber: number
  occurredAt: number
  type: string
  event: JsonObject
  shell: ShellEvent | null
}

export type StreamMessage =
  | {
      type: 'history'
      envelopes: StreamEnvelope[]
      throughEventNumber: number
    }
  | { type: 'event'; envelope: StreamEnvelope }

function readShellEvent(event: JsonObject): ShellEvent | null {
  switch (event.type) {
    case 'workspace.updated':
      return {
        type: 'workspace.updated',
        workspace: nested(event, 'workspace', readWorkspace),
      }
    case 'start.updated':
      return { type: 'start.updated', start: nested(event, 'start', readStart) }
    case 'workspace.title':
      return { type: 'workspace.title', name: text(event, 'name') }
    default:
      return null
  }
}

export function readEnvelope(value: unknown): StreamEnvelope {
  const envelope = record(value, 'envelope')
  const event = record(envelope.event, 'event')
  return {
    workspaceId: text(envelope, 'workspaceId'),
    eventNumber: count(envelope, 'eventNumber'),
    occurredAt: count(envelope, 'occurredAt'),
    type: text(event, 'type'),
    event,
    shell: readShellEvent(event),
  }
}

export function readStreamMessage(value: unknown): StreamMessage {
  const message = record(value, 'socket message')
  if (message.type === 'history') {
    const history = record(message.history, 'history')
    return {
      type: 'history',
      envelopes: items(history, 'events', readEnvelope),
      throughEventNumber: count(history, 'throughEventNumber'),
    }
  }
  if (message.type === 'event') {
    return { type: 'event', envelope: readEnvelope(message.envelope) }
  }
  throw new ParseError('The socket sent a message of an unknown type.')
}
