import type { StreamEnvelope } from '../../../app/api/read-events'
import type { WorkspaceStream } from '../../../app/events'
import type {
  WorkspaceEvent,
  WorkspaceEventEnvelope,
} from '../../../shared/events'
import type { SubscribeWorkspaceEvents } from '../../../terminal/tool-parts/workspace'

/**
 * The event of an envelope that a tool reads: an update of the workspace,
 * which the stream already read, or the revoke of a preview. Null for the
 * other events, and for a revoke without its preview.
 */
function toolEvent(envelope: StreamEnvelope): WorkspaceEvent | null {
  if (envelope.shell?.type === 'workspace.updated') return envelope.shell
  if (envelope.type !== 'preview.revoked') return null
  const { previewId } = envelope.event
  return typeof previewId === 'string'
    ? { type: 'preview.revoked', previewId }
    : null
}

/**
 * The events that the tools of one workspace read, from the ordered stream
 * of its model: each update of the workspace and each revoke of a preview,
 * once and in order. It follows the stream from before the first open, so
 * it reads the stored history too. It keeps the revokes, so a tool that
 * shows later gets them first, as its stored history, then the live events.
 */
export class ToolEvents {
  private readonly revokes: WorkspaceEventEnvelope[] = []
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
      if (event.type === 'preview.revoked') this.revokes.push(typed)
      for (const listener of [...this.listeners]) listener(typed)
    })
  }

  /** The events of a tool: the kept revokes at once, then the live events. */
  readonly subscribe: SubscribeWorkspaceEvents = (listener) => {
    for (const envelope of this.revokes) listener(envelope)
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}
