import type { ServiceControlAction } from '../../shared/generated/ServiceControlAction'
import type { ServiceLogResponse } from '../../shared/generated/ServiceLogResponse'
import type { ServiceTarget } from '../../shared/generated/ServiceTarget'
import { activeWait } from '../../app/org-waits'
import type { AppServices } from '../../app/services'
import type {
  WorkspaceIdentity,
  WorkspaceStore,
} from '../../app/workspace-store'
import type { ApiFetch, ToolResult } from '../../terminal/tool-parts/request'
import {
  subscribeToWorkspace,
  type SubscribeWorkspaceEvents,
} from '../../terminal/tool-parts/workspace'
import { controlAnswer, type ServiceAnswer } from './serviceAnswer'
import {
  getServiceCatalogue,
  readServiceLog,
  sendServiceControl,
} from './servicesApi'
import {
  initialServices,
  runKey,
  servicesReducer,
  type ServicesAction,
  type ServicesState,
} from './servicesState'

/**
 * What the store takes from the app: the fetch of the org, the timers, the
 * return to the page, whether the page shows, and new IDs.
 */
export type ServicesHost = Pick<
  AppServices,
  'delay' | 'onFocus' | 'visible' | 'newId'
> & { fetch: ApiFetch }

/**
 * The services of one workspace, outside React. A connection is one running
 * period of the computer: it reads the list, and again at each report of
 * the ports. Its end forgets the list, so a later period never shows the
 * list of an earlier one. While a part shows the list, `watch` reads it
 * again after `activeWait` and at each return to the page, so a service
 * that ends without a port still shows its end. No read adds activity.
 */
export class ServicesStore implements WorkspaceStore<ServicesState> {
  private state: ServicesState = initialServices
  private readonly listeners = new Set<() => void>()
  private readonly workspace: WorkspaceIdentity
  private readonly host: ServicesHost
  /** The connection that runs, or null. */
  private connection: object | null = null
  private reading: AbortController | null = null
  private readQueued = false
  private watchers = 0
  private stopFocus: (() => void) | null = null
  private cancelTimer: (() => void) | null = null

  constructor(workspace: WorkspaceIdentity, host: ServicesHost) {
    this.workspace = workspace
    this.host = host
  }

  readonly getSnapshot = (): ServicesState => this.state

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private get requests() {
    return { ...this.workspace, fetch: this.host.fetch }
  }

  /** Starts a running period until the result ends it. */
  connect(subscribe: SubscribeWorkspaceEvents): () => void {
    const connection = {}
    this.connection = connection
    const stopEvents = subscribeToWorkspace(
      { workspaceId: this.workspace.workspaceId, subscribe },
      ({ event }) => {
        if (this.connection === connection && event.type === 'ports.updated')
          this.queueRefresh()
      },
    )
    this.queueRefresh()
    return () => {
      stopEvents()
      if (this.connection !== connection) return
      this.connection = null
      this.reading?.abort()
      this.reading = null
      this.clearTimer()
      this.apply({ type: 'ended' })
    }
  }

  /**
   * Reads the list now, in place of a read that runs. The promise ends with
   * the read. Outside a running period it reads nothing.
   */
  refresh = (): Promise<void> => {
    const connection = this.connection
    if (connection === null) return Promise.resolve()
    this.reading?.abort()
    this.clearTimer()
    const reading = new AbortController()
    this.reading = reading
    return getServiceCatalogue(this.requests, reading.signal).then((result) => {
      if (reading.signal.aborted || this.connection !== connection) return
      this.reading = null
      this.apply(
        result.ok
          ? { type: 'loaded', catalogue: result.value }
          : { type: 'load-failed', error: result.error },
      )
      this.schedule()
    })
  }

  /** A part shows the list. The result says that it no longer does. */
  watch(): () => void {
    this.watchers += 1
    if (this.watchers === 1) {
      this.stopFocus = this.host.onFocus(() => void this.refresh())
      void this.refresh()
    }
    let watching = true
    return () => {
      if (!watching) return
      watching = false
      this.watchers -= 1
      if (this.watchers > 0) return
      this.stopFocus?.()
      this.stopFocus = null
      this.clearTimer()
    }
  }

  /**
   * Sends one Stop or Restart of the observed run, with a new request ID.
   * Its row waits until the answer, also when the part that sent it closed.
   * `done` gets the answer once, then the list reads the actual state. The
   * control never goes again by itself.
   */
  control(
    target: ServiceTarget,
    action: ServiceControlAction,
    done: (answer: ServiceAnswer) => void,
  ): void {
    const key = runKey(target)
    if (this.state.pending.has(key)) return
    const request = { requestId: this.host.newId(), target, action }
    this.apply({ type: 'control', key, action })
    void sendServiceControl(this.requests, request).then((result) => {
      this.apply({ type: 'controlled', key })
      done(controlAnswer(request, result))
      void this.refresh()
    })
  }

  /** Reads the end of the log of the observed run, with a new request ID. */
  readLog(
    target: ServiceTarget,
    signal: AbortSignal,
  ): Promise<ToolResult<ServiceLogResponse>> {
    const request = { requestId: this.host.newId(), target }
    return readServiceLog(this.requests, request, signal)
  }

  private queueRefresh(): void {
    if (this.readQueued) return
    this.readQueued = true
    queueMicrotask(() => {
      this.readQueued = false
      void this.refresh()
    })
  }

  /** The next read of a shown list. A hidden page reads at its return. */
  private schedule(): void {
    this.clearTimer()
    if (this.watchers === 0 || this.connection === null) return
    this.cancelTimer = this.host.delay(activeWait, () => {
      this.cancelTimer = null
      if (this.host.visible.get()) return this.refresh()
    })
  }

  private clearTimer(): void {
    this.cancelTimer?.()
    this.cancelTimer = null
  }

  private apply(action: ServicesAction): void {
    const next = servicesReducer(this.state, action)
    if (next === this.state) return
    this.state = next
    for (const listener of [...this.listeners]) listener()
  }
}
