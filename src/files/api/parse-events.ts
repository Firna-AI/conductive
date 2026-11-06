import type { FileEvent } from '../../shared/files'
import { isObject, parseItems, readArray, readCount } from './guards'
import { parseChanges } from './parse-changes'
import { parseFileTree, parseTreeDelta } from './parse-tree'

/** A file event of the workspace stream, or null for any other event. */
export function parseFileEvent(value: unknown): FileEvent | null {
  if (!isObject(value)) return null
  switch (value.type) {
    case 'files.snapshot': {
      const tree = parseFileTree(value.tree)
      return tree ? { type: 'files.snapshot', tree } : null
    }
    case 'files.changed': {
      const delta = parseTreeDelta(value.delta)
      return delta ? { type: 'files.changed', delta } : null
    }
    case 'changes.updated': {
      const changes = parseChanges(value.changes)
      return changes ? { type: 'changes.updated', changes } : null
    }
    default:
      return null
  }
}

/**
 * One numbered event of the workspace. Every event keeps its number, so the
 * reader can find duplicates and gaps. Only file events keep their content.
 */
export interface StreamEnvelope {
  eventNumber: number
  event: FileEvent | null
}

export type StreamMessage =
  | {
      type: 'history'
      envelopes: StreamEnvelope[]
      throughEventNumber: number
    }
  | { type: 'event'; envelope: StreamEnvelope }

function parseEnvelope(value: unknown): StreamEnvelope | null {
  if (!isObject(value)) return null
  const eventNumber = readCount(value, 'eventNumber')
  if (eventNumber === null || eventNumber < 1) return null
  return { eventNumber, event: parseFileEvent(value.event) }
}

/** A message of the workspace event stream, from its JSON value. */
export function parseStreamMessage(value: unknown): StreamMessage | null {
  if (!isObject(value)) return null
  if (value.type === 'event') {
    const envelope = parseEnvelope(value.envelope)
    return envelope ? { type: 'event', envelope } : null
  }
  if (value.type !== 'history' || !isObject(value.history)) return null
  const events = readArray(value.history, 'events')
  const through = readCount(value.history, 'throughEventNumber')
  if (events === null || through === null) return null
  const envelopes = parseItems(events, parseEnvelope).sort(
    (left, right) => left.eventNumber - right.eventNumber,
  )
  return { type: 'history', envelopes, throughEventNumber: through }
}
