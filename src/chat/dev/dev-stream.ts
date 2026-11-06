import type {
  WorkspaceEvent,
  WorkspaceEventEnvelope,
} from '../../shared/events'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import type {
  StreamListener,
  SubscribeToWorkspace,
} from '../stream/workspace-stream'
import type { Clock } from '../ui/clock'

/**
 * The workspace stream of the development page, on the fake's event store.
 * It numbers new events, and it can drop the connections, resend an event,
 * and send two events out of order, so the chat's reader can be watched.
 */
export class DevStream {
  private readonly events: FakeWorkspaceEvents
  private readonly connections = new Map<StreamListener, () => void>()
  private readonly workspaceId: string
  private readonly clock: Clock
  private sent: WorkspaceEventEnvelope | null = null
  last: number

  constructor(
    workspaceId: string,
    clock: Clock,
    stored: readonly WorkspaceEventEnvelope[],
  ) {
    this.workspaceId = workspaceId
    this.clock = clock
    this.events = new FakeWorkspaceEvents(stored)
    this.last = stored.reduce((top, item) => Math.max(top, item.eventNumber), 0)
  }

  readonly subscribe: SubscribeToWorkspace = (_target, after, listener) => {
    const unsubscribe = this.events.subscribe(after, (message) =>
      listener.message(message),
    )
    this.connections.set(listener, unsubscribe)
    return () => {
      unsubscribe()
      this.connections.delete(listener)
    }
  }

  private envelope(event: WorkspaceEvent): WorkspaceEventEnvelope {
    this.last += 1
    return {
      workspaceId: this.workspaceId,
      eventNumber: this.last,
      occurredAt: this.clock.now(),
      event,
    }
  }

  emit(event: WorkspaceEvent): void {
    this.sent = this.envelope(event)
    this.events.emit(this.sent)
  }

  /** Sends the last event again, as the runner does after a lost confirm. */
  resendLast(): void {
    if (this.sent) this.events.emit(this.sent)
  }

  /** Sends the second event first, and the first one after a delay. */
  emitOutOfOrder(first: WorkspaceEvent, second: WorkspaceEvent): number {
    const early = this.envelope(first)
    const late = this.envelope(second)
    this.events.emit(late)
    return window.setTimeout(() => this.events.emit(early), 1_500)
  }

  /** Drops every open connection, as a lost network does. */
  drop(): void {
    for (const [listener, unsubscribe] of this.connections) {
      unsubscribe()
      listener.closed()
    }
    this.connections.clear()
  }
}
