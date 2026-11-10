import { FakeApiServer } from '../test-support/fake-api'
import { fetchFiles } from '../test-support/fake-files'
import { FAKE_ORIGIN, FAKE_TIME } from '../test-support/fixtures/core'
import { createApiClient, type FetchLike } from './api/client'
import type {
  Delay,
  StreamHandlers,
  StreamTarget,
  WorkspaceEventSource,
} from './events'
import type { AppServices, KeyPress, KeyValueStorage } from './services'
import type { Readable } from './store'

function requestKey(method: string, path: string): string {
  return `${method} ${new URL(path, FAKE_ORIGIN).pathname}`
}

/** Where a held request waits: before the server sees it, or after it answers. */
type HoldPoint = 'request' | 'answer'

interface Hold {
  point: HoldPoint
  gate: Promise<void>
}

/** Requests that wait until the test releases them, to order an answer. */
export class HeldRequests {
  private readonly holds = new Map<string, Hold[]>()
  private readonly releases = new Map<string, (() => void)[]>()
  readonly fetch: FetchLike

  constructor(server: FakeApiServer) {
    this.fetch = async (input, init) => {
      const hold = this.holds
        .get(requestKey(init?.method ?? 'GET', input))
        ?.shift()
      if (hold?.point === 'request') await hold.gate
      const response = await server.fetch(input, init)
      if (hold?.point === 'answer') await hold.gate
      return response
    }
  }

  /**
   * The next request with this method and path waits for `release` before
   * the server sees it. Each call holds one more request, so two requests
   * can wait at one path.
   */
  hold(method: string, path: string): void {
    this.add(method, path, 'request')
  }

  /**
   * The server answers the next request with this method and path at once,
   * with the reply that it has then. The answer waits for `release`.
   */
  holdAnswer(method: string, path: string): void {
    this.add(method, path, 'answer')
  }

  /** Lets the oldest held request with this method and path go on. */
  release(method: string, path: string): void {
    this.releases.get(requestKey(method, path))?.shift()?.()
  }

  private add(method: string, path: string, point: HoldPoint): void {
    const key = requestKey(method, path)
    const holds = this.holds.get(key) ?? []
    const releases = this.releases.get(key) ?? []
    holds.push({
      point,
      gate: new Promise((resolve) => {
        releases.push(() => resolve())
      }),
    })
    this.holds.set(key, holds)
    this.releases.set(key, releases)
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

  /**
   * Runs only the timers that wait `ms`, such as the reads of a pending
   * job, and leaves the others, such as a slow backup read, waiting.
   */
  async run(ms: number): Promise<void> {
    const due = [...this.timers].filter((timer) => timer.ms === ms)
    for (const timer of due) this.timers.delete(timer)
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

/** The input of the user on the page, which comes only when the test says so. */
export class ManualInput {
  private readonly listeners = new Set<() => void>()

  readonly onInput = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  get listening(): number {
    return this.listeners.size
  }

  /** The user types, presses a key or the pointer, or scrolls. */
  input(): void {
    for (const listener of [...this.listeners]) listener()
  }
}

/** The key presses of the page, which come only when the test says so. */
class ManualKeys {
  private readonly listeners = new Set<(press: KeyPress) => void>()

  readonly onKey = (listener: (press: KeyPress) => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** The person presses a key. */
  press(press: KeyPress): void {
    for (const listener of [...this.listeners]) listener(press)
  }
}

/** Whether the page shows. It starts visible and changes when the test says so. */
export class ManualVisibility implements Readable<boolean> {
  private shown = true
  private readonly listeners = new Set<() => void>()

  readonly get = (): boolean => this.shown

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  get listening(): number {
    return this.listeners.size
  }

  /** The page hides, or it shows again. */
  set(shown: boolean): void {
    this.shown = shown
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
 * The page shows, unless the test gives a `ManualVisibility` and hides it.
 * Input and keys come only through a `ManualInput` and `ManualKeys` that
 * the test gives. The keyboard is not a Mac, unless the test says so.
 */
export function testServices(
  server: FakeApiServer,
  overrides: Partial<AppServices> & { fetch?: FetchLike } = {},
): AppServices {
  let id = 0
  const { fetch, ...rest } = overrides
  return {
    api: createApiClient(
      fetch ?? server.fetch,
      fetchFiles(fetch ?? server.fetch),
    ),
    events: new RecordingEvents(),
    now: () => FAKE_TIME,
    timeZone: 'UTC',
    storage: new MemoryStorage(),
    newId: () => `client-${++id}`,
    leave: () => undefined,
    appOrigin: FAKE_ORIGIN,
    copy: async () => undefined,
    delay: new ManualDelay().delay,
    onFocus: new ManualFocus().onFocus,
    onInput: new ManualInput().onInput,
    onKey: new ManualKeys().onKey,
    platform: 'other',
    visible: new ManualVisibility(),
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
