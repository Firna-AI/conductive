import type { WorkspaceEventSource } from '../app/events'
import type {
  WorkspaceEventEnvelope,
  WorkspaceSocketMessage,
} from '../shared/events'
import { seedOf } from './fake-workspace-seed'

function lastNumber(events: readonly WorkspaceEventEnvelope[]): number {
  return events.reduce((last, event) => Math.max(last, event.eventNumber), 0)
}

/** A screen injects this subscription in place of its native WebSocket adapter. */
export class FakeWorkspaceEvents {
  private readonly listeners = new Set<
    (message: WorkspaceSocketMessage) => void
  >()
  private readonly events: WorkspaceEventEnvelope[]

  constructor(events: readonly WorkspaceEventEnvelope[]) {
    this.events = structuredClone([...events])
  }

  private forWorkspace(
    workspaceId?: string,
  ): readonly WorkspaceEventEnvelope[] {
    return workspaceId === undefined
      ? this.events
      : this.events.filter((event) => event.workspaceId === workspaceId)
  }

  last(workspaceId?: string): number {
    return lastNumber(this.forWorkspace(workspaceId))
  }

  previewRevoked(workspaceId: string, previewId: string): boolean {
    return this.events.some(
      (envelope) =>
        envelope.workspaceId === workspaceId &&
        envelope.event.type === 'preview.revoked' &&
        envelope.event.previewId === previewId,
    )
  }

  stateRead(workspaceId: string) {
    const events = [...this.forWorkspace(workspaceId)].sort(
      (a, b) => a.eventNumber - b.eventNumber,
    )
    return {
      eventNumber: events.at(-1)?.eventNumber ?? 0,
      seed: seedOf(events),
    }
  }

  history(afterEventNumber = 0, workspaceId?: string) {
    const events = this.forWorkspace(workspaceId)
    return {
      events: structuredClone(
        events.filter((event) => event.eventNumber > afterEventNumber),
      ),
      throughEventNumber: lastNumber(events),
    }
  }

  /** The app's socket returns only the history and live events of its target. */
  readonly open: WorkspaceEventSource['open'] = (target, handlers) =>
    this.subscribe(
      target.afterEventNumber,
      handlers.message,
      target.workspaceId,
    )

  subscribe(
    afterEventNumber: number,
    listener: (message: WorkspaceSocketMessage) => void,
    workspaceId?: string,
  ): () => void {
    const receive = (message: WorkspaceSocketMessage) => {
      if (
        message.type === 'history' ||
        workspaceId === undefined ||
        message.envelope.workspaceId === workspaceId
      )
        listener(message)
    }
    this.listeners.add(receive)
    receive({
      type: 'history',
      history: this.history(afterEventNumber, workspaceId),
    })
    return () => this.listeners.delete(receive)
  }

  /** Tests can emit a duplicate or gap to exercise the screen's own reader. */
  emit(envelope: WorkspaceEventEnvelope): void {
    this.store(envelope)
    this.publish(envelope)
  }

  /** Stores an event without sending a live message. */
  store(envelope: WorkspaceEventEnvelope): void {
    this.events.push(structuredClone(envelope))
  }

  /** Sends a live message without storing the event again. */
  publish(envelope: WorkspaceEventEnvelope): void {
    for (const listener of this.listeners) {
      listener({ type: 'event', envelope: structuredClone(envelope) })
    }
  }
}
