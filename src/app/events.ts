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
 */
export class WorkspaceStream {
  /** The number of the last event that arrived. */
  readonly last = new Store(0)
  private readonly listeners = new Set<(envelope: StreamEnvelope) => void>()
  private closeSource: (() => void) | null = null
  private cancelRetry: (() => void) | null = null
  private failures = 0
  private running = false
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
    this.closeSource = this.source.open(
      { ...this.target, afterEventNumber: this.last.get() },
      {
        message: (value) => this.receive(value),
        closed: () => this.retryLater(),
      },
    )
  }

  private reconnect(): void {
    this.closeSource?.()
    this.closeSource = null
    if (this.running) this.connect()
  }

  private retryLater(): void {
    this.closeSource = null
    if (!this.running) return
    const wait = reconnectWait(this.failures)
    this.failures += 1
    this.cancelRetry = this.delay(wait, () => {
      this.cancelRetry = null
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
      const ordered = [...message.envelopes].sort(
        (a, b) => a.eventNumber - b.eventNumber,
      )
      for (const envelope of ordered) this.accept(envelope)
      this.failures = 0
      if (message.throughEventNumber > this.last.get()) {
        this.last.set(message.throughEventNumber)
      }
      return
    }
    // A gap reads again after the last number. `accept` drops a resent event.
    if (message.envelope.eventNumber > this.last.get() + 1) {
      this.reconnect()
      return
    }
    this.accept(message.envelope)
  }

  private accept(envelope: StreamEnvelope): void {
    if (envelope.eventNumber <= this.last.get()) return
    this.last.set(envelope.eventNumber)
    // The number counts in any case. Only this workspace's events reach the screens.
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
