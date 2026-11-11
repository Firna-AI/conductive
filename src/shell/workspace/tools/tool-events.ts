import { choice, count, ParseError, text } from '../../../app/api/parse'
import {
  readPortsUpdated,
  type StreamEnvelope,
} from '../../../app/api/read-events'
import type { WorkspaceStream } from '../../../app/events'
import type { RunnerEventRefused } from '../../../shared/chat-events'
import type {
  WorkspaceEvent,
  WorkspaceEventEnvelope,
} from '../../../shared/events'
import type { SubscribeWorkspaceEvents } from '../../../terminal/tool-parts/workspace'

const reasons: readonly RunnerEventRefused['reason'][] = [
  'too_large',
  'invalid',
  'turn_not_active',
]

/**
 * True for the marker of a failed repair of the list of listening ports.
 * Only the marker of the refused fresh report says `repairFailed`, so the
 * first loss of a report reaches no tool. The list belongs to no session.
 */
function isFailedPortsRepair(envelope: StreamEnvelope): boolean {
  const { event } = envelope
  return (
    envelope.type === 'runner.event-refused' &&
    event.repairFailed === true &&
    event.sessionId === null &&
    event.runnerEventType === 'ports.updated'
  )
}

function readFailedPortsRepair(envelope: StreamEnvelope): RunnerEventRefused {
  const { event } = envelope
  return {
    type: 'runner.event-refused',
    streamId: text(event, 'streamId'),
    runnerEventNumber: count(event, 'runnerEventNumber'),
    runnerEventType: 'ports.updated',
    reason: choice(event, 'reason', reasons),
    sessionId: null,
    turnId: null,
    repairFailed: true,
  }
}

/** The report of the listening ports, or its failed repair, or null. */
function portsEvent(envelope: StreamEnvelope): WorkspaceEvent | null {
  try {
    if (envelope.type === 'ports.updated')
      return readPortsUpdated(envelope.event)
    if (isFailedPortsRepair(envelope)) return readFailedPortsRepair(envelope)
    return null
  } catch (error) {
    // A report that the app can't read leaves the last one in place.
    if (error instanceof ParseError) return null
    throw error
  }
}

/**
 * The event of an envelope that a tool reads: an update of the workspace,
 * which the stream already read, the revoke of a preview, or a report of the
 * listening ports and the failed repair of that report. Null for the other
 * events, and for an event without its data.
 */
function toolEvent(envelope: StreamEnvelope): WorkspaceEvent | null {
  if (envelope.shell?.type === 'workspace.updated') return envelope.shell
  if (envelope.type !== 'preview.revoked') return portsEvent(envelope)
  const { previewId } = envelope.event
  return typeof previewId === 'string'
    ? { type: 'preview.revoked', previewId }
    : null
}

function byNumber(
  left: WorkspaceEventEnvelope,
  right: WorkspaceEventEnvelope,
): number {
  return left.eventNumber - right.eventNumber
}

/**
 * The events that the tools of one workspace read, from the ordered stream
 * of its model, once and in order. It follows the stream from before the
 * first open, so it reads the stored history too. A tool that shows later
 * gets the kept events first, in the order of their numbers, as its stored
 * history, then the live events. The kept events are each revoke, the
 * latest report of the listening ports, and the first failed repair of the
 * list since that report.
 */
export class ToolEvents {
  private readonly revokes: WorkspaceEventEnvelope[] = []
  private ports: WorkspaceEventEnvelope | null = null
  private portsFailure: WorkspaceEventEnvelope | null = null
  private readonly listeners = new Set<
    (envelope: WorkspaceEventEnvelope) => void
  >()

  /** Reads the stream. The result ends the reading. */
  follow(stream: WorkspaceStream): () => void {
    return stream.subscribe((envelope) => {
      const event = toolEvent(envelope)
      if (!event) return
      const typed: WorkspaceEventEnvelope = {
        workspaceId: envelope.workspaceId,
        eventNumber: envelope.eventNumber,
        occurredAt: envelope.occurredAt,
        event,
      }
      this.keep(typed)
      for (const listener of [...this.listeners]) listener(typed)
    })
  }

  /** Keeps an event that a tool that shows later needs. */
  private keep(envelope: WorkspaceEventEnvelope): void {
    switch (envelope.event.type) {
      case 'preview.revoked':
        this.revokes.push(envelope)
        return
      case 'ports.updated':
        // A full report replaces the list and ends a failed repair.
        this.ports = envelope
        this.portsFailure = null
        return
      case 'runner.event-refused':
        // A further failure keeps the time of the first one.
        this.portsFailure ??= envelope
        return
    }
  }

  /** The events of a tool: the kept events at once, then the live events. */
  readonly subscribe: SubscribeWorkspaceEvents = (listener) => {
    const kept = [...this.revokes, this.ports, this.portsFailure]
      .filter((envelope) => envelope !== null)
      .sort(byNumber)
    for (const envelope of kept) listener(envelope)
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}
