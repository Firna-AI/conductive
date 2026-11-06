import type {
  WorkspaceEventEnvelope,
  WorkspaceSocketMessage,
} from '../shared/events'

/** A screen injects this subscription in place of its native WebSocket adapter. */
export class FakeWorkspaceEvents {
  private readonly listeners = new Set<
    (message: WorkspaceSocketMessage) => void
  >()
  private readonly events: WorkspaceEventEnvelope[]

  constructor(events: readonly WorkspaceEventEnvelope[]) {
    this.events = structuredClone([...events])
  }

  history(afterEventNumber = 0) {
    return {
      events: structuredClone(
        this.events.filter((event) => event.eventNumber > afterEventNumber),
      ),
      throughEventNumber: this.events.at(-1)?.eventNumber ?? 0,
    }
  }

  subscribe(
    afterEventNumber: number,
    listener: (message: WorkspaceSocketMessage) => void,
  ): () => void {
    this.listeners.add(listener)
    listener({ type: 'history', history: this.history(afterEventNumber) })
    return () => this.listeners.delete(listener)
  }

  /** Tests can emit a duplicate or gap to exercise the screen's own reader. */
  emit(envelope: WorkspaceEventEnvelope): void {
    this.events.push(structuredClone(envelope))
    for (const listener of this.listeners) {
      listener({ type: 'event', envelope: structuredClone(envelope) })
    }
  }
}
