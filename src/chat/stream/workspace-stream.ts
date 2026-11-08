import type { WorkspaceTarget } from '../api/client'
import {
  readStreamMessage,
  type StoredEvents,
  type StreamEnvelope,
} from '../api/read-workspace'

export interface StreamListener {
  /** One message of the stream: the stored history first, then each event. */
  message(message: unknown): void
  /** The connection dropped. The stream opens a new one after its cursor. */
  closed(): void
}

/**
 * Opens the event stream of one workspace after an event number, and returns
 * the function that closes it. The app's socket adapter and the fake API both
 * fit this shape.
 */
export type SubscribeToWorkspace = (
  target: WorkspaceTarget,
  afterEventNumber: number,
  listener: StreamListener,
) => () => void

type TimerHandle = ReturnType<typeof setTimeout>

export interface StreamTimers {
  set(callback: () => void, delayMs: number): TimerHandle
  clear(handle: TimerHandle): void
}

const browserTimers: StreamTimers = {
  set: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
  clear: (handle) => globalThis.clearTimeout(handle),
}

const MAX_RECONNECT_DELAY_MS = 15_000

/**
 * Reads the event stream of one workspace in event-number order. The cursor
 * spans every session and file event of the workspace. A resent event is
 * dropped. An event after a gap waits until the gap fills, and the stream
 * opens again once after the cursor so the server can resend what is missing.
 * An event of another workspace is ignored. A hold closes the connection and
 * keeps the cursor, so a release asks only for the events after it.
 *
 * The stored history can come in pages that share one cutoff. A page can
 * leave out the numbers of events that a later event of the read replaces,
 * so its events need no gap check. The cursor moves to the progress of each
 * page, and to the cutoff only after the final page. Live events wait until
 * then, and a gap after the cutoff opens the stream again.
 */
export class WorkspaceStream {
  private readonly target: WorkspaceTarget
  private readonly subscribe: SubscribeToWorkspace
  private readonly deliver: (envelopes: readonly StreamEnvelope[]) => void
  private readonly timers: StreamTimers
  private readonly pending = new Map<number, StreamEnvelope>()
  private cursor = 0
  private generation = 0
  private unsubscribe: (() => void) | null = null
  private recoveringFrom: number | null = null
  /** The cutoff of a paged history that has more pages to come, or null. */
  private replay: number | null = null
  private retryHandle: TimerHandle | null = null
  private failures = 0
  private running = false
  private held = false

  constructor(options: {
    target: WorkspaceTarget
    subscribe: SubscribeToWorkspace
    deliver: (envelopes: readonly StreamEnvelope[]) => void
    timers?: StreamTimers
  }) {
    this.target = options.target
    this.subscribe = options.subscribe
    this.deliver = options.deliver
    this.timers = options.timers ?? browserTimers
  }

  /**
   * The number through which the stream applied the state with no gap. A
   * history page can leave out an event that a later event replaces, and
   * during more pages it is the progress of the pages.
   */
  get through(): number {
    return this.cursor
  }

  /** Runs the stream after the event number. A held stream opens at its release. */
  start(afterEventNumber: number): void {
    this.running = true
    this.cursor = afterEventNumber
    if (!this.held) this.open()
  }

  stop(): void {
    this.running = false
    this.close()
  }

  /**
   * Closes the connection and keeps it closed, also through a start or a
   * retry, until `release`. The cursor and the waiting events stay.
   */
  hold(): void {
    this.held = true
    this.close()
  }

  /** Opens the connection again after the cursor, when the stream runs. */
  release(): void {
    if (!this.held) return
    this.held = false
    if (this.running) this.open()
  }

  private close(): void {
    this.generation += 1
    this.unsubscribe?.()
    this.unsubscribe = null
    if (this.retryHandle !== null) this.timers.clear(this.retryHandle)
    this.retryHandle = null
  }

  private open(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
    this.replay = null
    this.generation += 1
    const generation = this.generation
    const unsubscribe = this.subscribe(this.target, this.cursor, {
      message: (message) => {
        if (generation === this.generation) this.receive(message)
      },
      closed: () => {
        if (generation === this.generation) this.dropped()
      },
    })
    if (generation === this.generation) this.unsubscribe = unsubscribe
    else unsubscribe()
  }

  private receive(raw: unknown): void {
    const message = readStreamMessage(raw)
    if (!message) return
    const ready: StreamEnvelope[] = []
    if (message.type === 'history') {
      this.failures = 0
      this.page(message.history, ready)
    } else {
      this.accept(message.envelope, ready)
    }
    if (ready.length > 0) this.deliver(ready)
    // A live event waits for the final page, and opens nothing before it.
    if (this.replay !== null) return
    if (this.pending.size === 0) this.recoveringFrom = null
    else if (this.recoveringFrom !== this.cursor) {
      this.recoveringFrom = this.cursor
      this.schedule(0)
    }
  }

  /**
   * Takes one page of the stored history. Its events apply in order, also
   * across numbers that the page leaves out. The cutoff counts only after
   * the final page, which then lets the waiting live events follow it.
   */
  private page(history: StoredEvents, ready: StreamEnvelope[]): void {
    const through = history.throughEventNumber
    const envelopes = [...history.envelopes].sort(
      (left, right) => left.eventNumber - right.eventNumber,
    )
    for (const envelope of envelopes) {
      const number = envelope.eventNumber
      if (envelope.workspaceId !== this.target.workspaceId) continue
      if (!Number.isInteger(number) || number <= this.cursor) continue
      if (number > through) continue
      ready.push(envelope)
      this.cursor = number
    }
    const next = history.nextAfterEventNumber
    if (next !== null) {
      this.replay = through
      this.cursor = Math.max(this.cursor, Math.min(next, through))
      return
    }
    this.replay = null
    this.cursor = Math.max(this.cursor, through)
    for (const number of [...this.pending.keys()]) {
      if (number <= this.cursor) this.pending.delete(number)
    }
    this.drain(ready)
  }

  private accept(envelope: StreamEnvelope, ready: StreamEnvelope[]): void {
    const number = envelope.eventNumber
    if (envelope.workspaceId !== this.target.workspaceId) return
    if (!Number.isInteger(number) || number <= this.cursor) return
    if (this.replay !== null || number !== this.cursor + 1) {
      this.pending.set(number, envelope)
      return
    }
    ready.push(envelope)
    this.cursor = number
    this.drain(ready)
  }

  /** Takes the waiting events that follow the cursor with no gap. */
  private drain(ready: StreamEnvelope[]): void {
    let next = this.pending.get(this.cursor + 1)
    while (next) {
      this.pending.delete(next.eventNumber)
      ready.push(next)
      this.cursor = next.eventNumber
      next = this.pending.get(this.cursor + 1)
    }
  }

  private dropped(): void {
    this.generation += 1
    this.unsubscribe?.()
    this.unsubscribe = null
    this.failures += 1
    this.schedule(
      Math.min(MAX_RECONNECT_DELAY_MS, 1_000 * 2 ** (this.failures - 1)),
    )
  }

  private schedule(delayMs: number): void {
    if (!this.running || this.held) return
    if (this.retryHandle !== null) this.timers.clear(this.retryHandle)
    this.retryHandle = this.timers.set(() => {
      this.retryHandle = null
      if (this.running) this.open()
    }, delayMs)
  }
}
