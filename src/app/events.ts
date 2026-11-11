import { workspaceEventsPath } from '../shared/events'
import {
  readStreamMessage,
  type StreamEnvelope,
  type StreamMessage,
} from './api/read-events'
import { Store } from './store'
import type { OpenTerminalSocket } from './terminal-transport'

export interface StreamTarget {
  orgId: string
  workspaceId: string
  afterEventNumber: number
}

export interface StreamHandlers {
  /** Each raw message of the socket. The first one holds the history. */
  message: (value: unknown) => void
  /** The connection closed without a call to its close function. */
  closed: () => void
}

/** Opens the event stream of one workspace. The result closes it. */
export interface WorkspaceEventSource {
  open(target: StreamTarget, handlers: StreamHandlers): () => void
  /**
   * Opens the terminal socket at its path on the Worker, on the same origin
   * as the event stream. A source without a Worker, as in a test or the
   * development fake, leaves it out.
   */
  openSocket?: OpenTerminalSocket
}

/** Runs a function later, and returns its cancel. Tests run it themselves. */
export type Delay = (ms: number, run: () => unknown) => () => void

export const browserDelay: Delay = (ms, run) => {
  const timer = setTimeout(run, ms)
  return () => clearTimeout(timer)
}

/**
 * The wait before a stream opens again after a dropped connection, in ms.
 * It doubles with each drop in a row, up to 15 seconds.
 */
export function reconnectWait(failures: number): number {
  return Math.min(15_000, 1_000 * 2 ** failures)
}

/**
 * The ordered events of one open workspace. Every subscriber gets each
 * event once, in the order of its number. A resent event is dropped. A gap
 * or a dropped connection opens the stream again after the last number
 * that arrived, so no event gets lost.
 *
 * The stored history can come in pages that share one cutoff. A page can
 * leave out an event that a later event of the replay replaces, so `last`
 * stays at the last complete number until the final page has applied. Live
 * events wait until then, in their order.
 */
export class WorkspaceStream {
  /**
   * The number through which the complete state has applied. A replay can
   * leave out an event that a later event replaces, so a number through
   * which the state applied can have no event of its own.
   */
  readonly last = new Store(0)
  /**
   * Counts the replays that end after a dropped connection or a gap, so a
   * part that keeps its own reads, such as the access of the member, reads
   * again after a reconnect. A start after a stop counts nothing.
   */
  readonly reconnects = new Store(0)
  private readonly listeners = new Set<(envelope: StreamEnvelope) => void>()
  private closeSource: (() => void) | null = null
  private cancelRetry: (() => void) | null = null
  private failures = 0
  private running = false
  /** The connection takes the place of a lost one. */
  private reopened = false
  /**
   * The number that the pages of a replay have read through. The state
   * through it can still miss an event that a later page replaces, so only
   * a new connection starts after it.
   */
  private progress = 0
  /** The cutoff of a replay that has more pages to come, or null. */
  private replay: number | null = null
  /** The live events that wait for the final page of a replay. */
  private waiting: StreamEnvelope[] = []
  private readonly source: WorkspaceEventSource
  private readonly target: Omit<StreamTarget, 'afterEventNumber'>
  private readonly delay: Delay

  constructor(
    source: WorkspaceEventSource,
    target: Omit<StreamTarget, 'afterEventNumber'>,
    delay: Delay = browserDelay,
  ) {
    this.source = source
    this.target = target
    this.delay = delay
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.reopened = false
    this.connect()
  }

  stop(): void {
    this.running = false
    this.cancelRetry?.()
    this.cancelRetry = null
    this.closeSource?.()
    this.closeSource = null
  }

  subscribe(listener: (envelope: StreamEnvelope) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private connect(): void {
    this.replay = null
    this.waiting = []
    this.progress = Math.max(this.progress, this.last.get())
    this.closeSource = this.source.open(
      { ...this.target, afterEventNumber: this.progress },
      {
        message: (value) => this.receive(value),
        closed: () => this.retryLater(),
      },
    )
  }

  private reconnect(): void {
    this.closeSource?.()
    this.closeSource = null
    this.reopened = true
    if (this.running) this.connect()
  }

  private retryLater(): void {
    this.closeSource = null
    if (!this.running) return
    const wait = reconnectWait(this.failures)
    this.failures += 1
    this.cancelRetry = this.delay(wait, () => {
      this.cancelRetry = null
      this.reopened = true
      if (this.running) this.connect()
    })
  }

  private receive(value: unknown): void {
    let message: StreamMessage
    try {
      message = readStreamMessage(value)
    } catch {
      return
    }
    if (message.type === 'history') {
      this.failures = 0
      this.page(message)
      return
    }
    if (this.replay !== null) {
      this.waiting.push(message.envelope)
      return
    }
    this.live(message.envelope)
  }

  /**
   * Applies one page of a replay. Its events apply in order, also across
   * numbers that the page leaves out. Only the final page moves `last` to
   * the cutoff, and then the waiting live events follow it.
   */
  private page(message: Extract<StreamMessage, { type: 'history' }>): void {
    const through = message.throughEventNumber
    const ordered = [...message.envelopes].sort(
      (a, b) => a.eventNumber - b.eventNumber,
    )
    for (const envelope of ordered) {
      if (envelope.eventNumber <= this.progress) continue
      if (envelope.eventNumber > through) continue
      this.progress = envelope.eventNumber
      this.deliver(envelope)
    }
    const next = message.nextAfterEventNumber
    if (next !== null) {
      this.replay = through
      this.progress = Math.max(this.progress, Math.min(next, through))
      return
    }
    this.replay = null
    this.progress = Math.max(this.progress, through)
    if (this.progress > this.last.get()) this.last.set(this.progress)
    if (this.reopened) {
      this.reopened = false
      this.reconnects.set(this.reconnects.get() + 1)
    }
    const waiting = this.waiting.sort((a, b) => a.eventNumber - b.eventNumber)
    this.waiting = []
    for (const envelope of waiting) {
      if (this.live(envelope) === 'gap') return
    }
  }

  /** Applies a live event, or opens again after a gap, which it reports. */
  private live(envelope: StreamEnvelope): 'gap' | null {
    // A gap reads again after the last number. A resent event is dropped.
    if (envelope.eventNumber > this.last.get() + 1) {
      this.reconnect()
      return 'gap'
    }
    if (envelope.eventNumber <= this.last.get()) return null
    this.progress = envelope.eventNumber
    this.last.set(envelope.eventNumber)
    this.deliver(envelope)
    return null
  }

  /** The number counts in any case. Only this workspace's events reach the screens. */
  private deliver(envelope: StreamEnvelope): void {
    if (envelope.workspaceId !== this.target.workspaceId) return
    for (const listener of [...this.listeners]) listener(envelope)
  }
}

/** The socket address of a path of the Worker at `origin`. */
function socketUrl(path: string, origin: string): URL {
  const url = new URL(path, origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url
}

/**
 * The sockets of the Worker at `origin`: the event socket of a workspace,
 * and its terminal. The Mac app gives the origin of its Worker, so both
 * reach the same Worker as its API.
 */
export function socketEventSource(origin: string): WorkspaceEventSource {
  return {
    openSocket: (path, protocol) =>
      new WebSocket(socketUrl(path, origin), protocol),
    open(target, handlers) {
      const path = workspaceEventsPath(
        target.orgId,
        target.workspaceId,
        target.afterEventNumber,
      )
      const socket = new WebSocket(socketUrl(path, origin))
      const onMessage = (event: MessageEvent) => {
        if (typeof event.data !== 'string') return
        let value: unknown
        try {
          value = JSON.parse(event.data)
        } catch {
          return
        }
        handlers.message(value)
      }
      socket.addEventListener('message', onMessage)
      socket.addEventListener('close', handlers.closed)
      return () => {
        socket.removeEventListener('message', onMessage)
        socket.removeEventListener('close', handlers.closed)
        socket.close()
      }
    },
  }
}
