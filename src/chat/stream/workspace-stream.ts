import type { WorkspaceTarget } from '../api/client'
import { readStreamMessage, type StreamEnvelope } from '../api/read-workspace'

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
 * An event of another workspace is ignored.
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
  private retryHandle: TimerHandle | null = null
  private failures = 0
  private running = false

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

  /** The last event number that the stream applied with no gap before it. */
  get through(): number {
    return this.cursor
  }

  start(afterEventNumber: number): void {
    this.running = true
    this.cursor = afterEventNumber
    this.open()
  }

  stop(): void {
    this.running = false
    this.generation += 1
    this.unsubscribe?.()
    this.unsubscribe = null
    if (this.retryHandle !== null) this.timers.clear(this.retryHandle)
    this.retryHandle = null
  }

  private open(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
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
    if (message.type === 'history') this.failures = 0
    const envelopes =
      message.type === 'history'
        ? [...message.history.envelopes].sort(
            (left, right) => left.eventNumber - right.eventNumber,
          )
        : [message.envelope]
    const ready: StreamEnvelope[] = []
    for (const envelope of envelopes) this.accept(envelope, ready)
    if (ready.length > 0) this.deliver(ready)
    if (this.pending.size === 0) this.recoveringFrom = null
    else if (this.recoveringFrom !== this.cursor) {
      this.recoveringFrom = this.cursor
      this.schedule(0)
    }
  }

  private accept(envelope: StreamEnvelope, ready: StreamEnvelope[]): void {
    const number = envelope.eventNumber
    if (envelope.workspaceId !== this.target.workspaceId) return
    if (!Number.isInteger(number) || number <= this.cursor) return
    if (number !== this.cursor + 1) {
      this.pending.set(number, envelope)
      return
    }
    ready.push(envelope)
    this.cursor = number
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
    if (!this.running) return
    if (this.retryHandle !== null) this.timers.clear(this.retryHandle)
    this.retryHandle = this.timers.set(() => {
      this.retryHandle = null
      if (this.running) this.open()
    }, delayMs)
  }
}
