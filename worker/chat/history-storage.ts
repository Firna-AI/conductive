import { jsonBytes } from '../../src/shared/event-limits'
import { parseFileEvent } from '../files/parsers'
import { normalizeSession } from './session-storage'
import type { ChatData } from './types'
import type { WorkspaceEvent, WorkspaceEventEnvelope } from './workspace-events'

interface StoredFileEvent {
  workspaceId: string
  eventNumber: number
  occurredAt: number
  fileEventChunks: number
}

export type StoredWorkspaceEvent = WorkspaceEventEnvelope | StoredFileEvent
const INLINE_FILE_EVENT_BYTES = 4_096
const CHUNK_CHARACTERS = 65_536
const encoder = new TextEncoder()
const chunkKey = (eventNumber: number, part: number) =>
  `chat:v1:history-chunk:${eventNumber}:${part}`

export function isFileEventWithPayload(event: WorkspaceEvent): boolean {
  return (
    event.type === 'files.snapshot' ||
    event.type === 'files.changed' ||
    event.type === 'changes.updated'
  )
}

/** File event stubs let session readers skip the payload. */
export async function saveHistoryEvent(
  data: ChatData,
  key: string,
  envelope: WorkspaceEventEnvelope,
): Promise<void> {
  if (!isFileEventWithPayload(envelope.event)) return data.put(key, envelope)
  const text = JSON.stringify(envelope.event)
  const envelopeBytes = jsonBytes({ ...envelope, event: 0 }) - 1
  if (
    envelopeBytes + encoder.encode(text).byteLength <=
    INLINE_FILE_EVENT_BYTES
  )
    return data.put(key, envelope)
  const fileEventChunks = Math.ceil(text.length / CHUNK_CHARACTERS)
  for (let part = 0; part < fileEventChunks; part++) {
    await data.put(
      chunkKey(envelope.eventNumber, part),
      text.slice(part * CHUNK_CHARACTERS, (part + 1) * CHUNK_CHARACTERS),
    )
  }
  await data.put(key, {
    workspaceId: envelope.workspaceId,
    eventNumber: envelope.eventNumber,
    occurredAt: envelope.occurredAt,
    fileEventChunks,
  } satisfies StoredFileEvent)
}

export async function deleteHistoryEvent(
  data: ChatData,
  key: string,
): Promise<void> {
  const stored = await data.get<StoredWorkspaceEvent>(key)
  if (stored && !('event' in stored)) {
    for (let part = 0; part < stored.fileEventChunks; part++)
      await data.delete(chunkKey(stored.eventNumber, part))
  }
  await data.delete(key)
}

export async function loadHistoryEvent(
  data: ChatData,
  stored: StoredWorkspaceEvent,
): Promise<WorkspaceEventEnvelope> {
  if ('event' in stored) {
    return stored.event.type === 'session.updated'
      ? {
          ...stored,
          event: {
            ...stored.event,
            session: normalizeSession(stored.event.session),
          },
        }
      : stored
  }
  const chunks: string[] = []
  for (let part = 0; part < stored.fileEventChunks; part++) {
    const text = await data.get<unknown>(chunkKey(stored.eventNumber, part))
    if (typeof text !== 'string')
      throw new Error('Stored file event is incomplete.')
    chunks.push(text)
  }
  const value: unknown = JSON.parse(chunks.join(''))
  return {
    workspaceId: stored.workspaceId,
    eventNumber: stored.eventNumber,
    occurredAt: stored.occurredAt,
    event: parseFileEvent(value),
  }
}
