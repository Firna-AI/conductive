import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_ORIGIN, FAKE_TIME } from '../test-support/fixtures/core'
import { createApiClient, type FetchLike } from './api/client'
import type {
  Delay,
  StreamHandlers,
  StreamTarget,
  WorkspaceEventSource,
} from './events'
import type { AppServices, KeyValueStorage } from './services'

function requestKey(method: string, path: string): string {
  return `${method} ${new URL(path, FAKE_ORIGIN).pathname}`
}

/** Requests that wait until the test releases them, to order an answer. */
export class HeldRequests {
  private readonly gates = new Map<string, Promise<void>[]>()
  private readonly releases = new Map<string, (() => void)[]>()
  readonly fetch: FetchLike

  constructor(server: FakeApiServer) {
    this.fetch = async (input, init) => {
      const gate = this.gates
        .get(requestKey(init?.method ?? 'GET', input))
        ?.shift()
      if (gate) await gate
      return server.fetch(input, init)
    }
  }

  /**
   * The next request with this method and path waits for `release`. Each
   * call holds one more request, so two requests can wait at one path.
   */
  hold(method: string, path: string): void {
    const key = requestKey(method, path)
    const gates = this.gates.get(key) ?? []
    const releases = this.releases.get(key) ?? []
    gates.push(
      new Promise((resolve) => {
        releases.push(() => resolve())
      }),
    )
    this.gates.set(key, gates)
    this.releases.set(key, releases)
  }

  /** Lets the oldest held request with this method and path go on. */
  release(method: string, path: string): void {
    this.releases.get(requestKey(method, path))?.shift()?.()
  }
}

/** A clock for timers that runs a timer only when the test says so. */
export class ManualDelay {
  private readonly timers = new Set<{ ms: number; run: () => unknown }>()

  readonly delay: Delay = (ms, run) => {
    const timer = { ms, run }
    this.timers.add(timer)
    return () => this.timers.delete(timer)
  }

  get pending(): number {
    return this.timers.size
  }

  /** The wait of each pending timer, in ms, in the order that they started. */
  get waits(): number[] {
    return [...this.timers].map((timer) => timer.ms)
  }

  /** Runs the due timers, and waits for the work that they started. */
  async runAll(): Promise<void> {
    const due = [...this.timers]
    this.timers.clear()
    await Promise.all(due.map((timer) => timer.run()))
  }
}

/** The focus of the page, which comes back only when the test says so. */
export class ManualFocus {
  private readonly listeners = new Set<() => void>()

  readonly onFocus = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  get listening(): number {
    return this.listeners.size
  }

  /** The user comes back to the page. */
  focus(): void {
    for (const listener of [...this.listeners]) listener()
  }
}

/** An event source that records each open and lets the test send messages. */
export class RecordingEvents implements WorkspaceEventSource {
  readonly opened: StreamTarget[] = []
  private handlers: StreamHandlers | null = null

  open(target: StreamTarget, handlers: StreamHandlers): () => void {
    this.opened.push(target)
    this.handlers = handlers
    return () => {
      this.handlers = null
    }
  }

  send(message: unknown): void {
    this.handlers?.message(message)
  }

  drop(): void {
    const handlers = this.handlers
    this.handlers = null
    handlers?.closed()
  }
}

export class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

/**
 * Services over a fake API server, with no real network, clock, timer, or
 * storage. A timer runs only through a `ManualDelay` that the test gives.
 */
export function testServices(
  server: FakeApiServer,
  overrides: Partial<AppServices> & { fetch?: FetchLike } = {},
): AppServices {
  let id = 0
  const { fetch, ...rest } = overrides
  return {
    api: createApiClient(fetch ?? server.fetch),
    events: new RecordingEvents(),
    now: () => FAKE_TIME,
    timeZone: 'UTC',
    storage: new MemoryStorage(),
    newId: () => `client-${++id}`,
    leave: () => undefined,
    copy: async () => undefined,
    delay: new ManualDelay().delay,
    onFocus: new ManualFocus().onFocus,
    ...rest,
  }
}

/**
 * Lets the promise chains of the fake API run to their end. It waits for
 * microtasks only, so it uses no clock and no timer.
 */
export async function flushMicrotasks(): Promise<void> {
  for (let turn = 0; turn < 50; turn += 1) await Promise.resolve()
}

/** The requests that the server got, as `METHOD path` lines in their order. */
export function requestLines(server: FakeApiServer): string[] {
  return server.requests.map((request) => {
    const url = new URL(request.url)
    return `${request.method} ${url.pathname}${url.search}`
  })
}
