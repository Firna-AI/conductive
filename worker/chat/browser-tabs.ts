import type {
  WorkspaceEventEnvelope,
  WorkspaceEventPeer as BrowserPeer,
} from './workspace-events'
import { HttpError } from '../http'
import {
  CONNECTION_CHECK_MS,
  type ConnectionIdentity,
} from '../security/connection-access'
import type { ChatDependencies } from './types'

export interface BrowserRegistration {
  identity: ConnectionIdentity
  tabId?: string
  deadline: number
  checkAt: number
}

export type BrowserPersistence = (
  registration: BrowserRegistration | null,
) => Promise<void>

type TabDependencies = Pick<
  ChatDependencies,
  'now' | 'scheduleBrowserCheck' | 'browserAlarm' | 'readConnectionAccess'
> &
  Partial<
    Pick<ChatDependencies, 'browserOpened' | 'browserClosed' | 'waitUntil'>
  >

function accessLost() {
  return new HttpError(
    404,
    'workspace_not_found',
    'The workspace is not available.',
  )
}

/** Registrations share one access batch and one durable alarm source. */
export class BrowserTabs {
  private readonly peers = new Map<BrowserPeer, BrowserRegistration>()
  private readonly persistence = new Map<BrowserPeer, BrowserPersistence>()
  private cancelSchedule: (() => void) | null = null
  private checking = false
  private pending: Promise<unknown> = Promise.resolve()
  private refresh: Promise<void> = Promise.resolve()
  private readonly dependencies: TabDependencies

  constructor(dependencies: TabDependencies) {
    this.dependencies = dependencies
  }

  closeAll(): void {
    for (const peer of this.peers.keys()) this.close(peer)
  }

  async add(
    peer: BrowserPeer,
    identity: ConnectionIdentity,
    tabId?: string,
    persist?: BrowserPersistence,
  ): Promise<() => void> {
    const started = this.dependencies.now()
    const [access] = await this.dependencies.readConnectionAccess(
      [identity],
      started,
    )
    if (!access || access.deadline <= this.dependencies.now())
      throw accessLost()
    if (tabId)
      await this.dependencies.browserOpened?.(identity.workspaceId, tabId)
    const checkAt = Math.min(
      this.dependencies.now() + CONNECTION_CHECK_MS,
      ...[...this.peers.values()].map((registration) => registration.checkAt),
    )
    this.register(
      peer,
      { identity, tabId, deadline: access.deadline, checkAt },
      persist,
    )
    this.save(peer)
    this.schedule()
    await this.pending
    return () => this.remove(peer)
  }

  async restore(
    peer: BrowserPeer,
    state: BrowserRegistration,
    persist: BrowserPersistence,
  ): Promise<void> {
    this.register(peer, state, persist)
    this.expire()
    this.schedule()
    await this.pending
  }

  check(peer: BrowserPeer): void {
    const registration = this.peers.get(peer)
    if (!registration || registration.deadline <= this.dependencies.now()) {
      this.close(peer)
      throw accessLost()
    }
  }

  publish(events: readonly WorkspaceEventEnvelope[]): void {
    for (const envelope of events)
      for (const peer of this.peers.keys()) {
        try {
          this.check(peer)
          peer.send({ type: 'event', envelope })
        } catch {
          this.close(peer)
        }
      }
  }

  /** Return after expiry is armed. An access read must not hold the alarm handler. */
  async alarm(): Promise<void> {
    this.expire()
    const due = [...this.peers.values()].some(
      (registration) => registration.checkAt <= this.dependencies.now(),
    )
    if (due && !this.checking) {
      this.refresh = this.recheck()
      this.dependencies.waitUntil?.(this.refresh)
    }
    this.schedule()
    await this.pending
  }

  async settled(): Promise<void> {
    await this.refresh
    await this.pending
  }

  remove(peer: BrowserPeer): void {
    const registration = this.peers.get(peer)
    const persist = this.persistence.get(peer)
    this.peers.delete(peer)
    this.persistence.delete(peer)
    if (persist) this.enqueue(() => persist(null))
    if (registration?.tabId && this.dependencies.browserClosed) {
      const closed = this.dependencies.browserClosed(
        registration.identity.workspaceId,
        registration.tabId,
      )
      if (this.dependencies.waitUntil) this.dependencies.waitUntil(closed)
      else void closed.catch(() => undefined)
    }
    this.schedule()
  }

  private register(
    peer: BrowserPeer,
    state: BrowserRegistration,
    persist?: BrowserPersistence,
  ): void {
    this.peers.set(peer, state)
    if (persist) this.persistence.set(peer, persist)
  }

  private save(peer: BrowserPeer): void {
    const persist = this.persistence.get(peer)
    const registration = this.peers.get(peer)
    if (persist && registration) {
      const state = structuredClone(registration)
      this.enqueue(() => persist(state))
    }
  }

  private enqueue(work: () => Promise<void>): void {
    const pending = this.pending.then(work)
    this.pending = pending.catch(() => this.closeAll())
    this.dependencies.waitUntil?.(pending)
  }

  private schedule(): void {
    const times = [...this.peers.values()].flatMap((registration) =>
      this.checking
        ? [registration.deadline]
        : [registration.deadline, registration.checkAt],
    )
    const at = times.length ? Math.min(...times) : null
    const alarm = this.dependencies.browserAlarm
    if (alarm) {
      this.enqueue(() => alarm(at))
      return
    }
    this.cancelSchedule?.()
    this.cancelSchedule =
      at === null
        ? null
        : (this.dependencies.scheduleBrowserCheck?.(
            async () => {
              const previous = this.refresh
              await this.alarm()
              if (previous !== this.refresh) await this.refresh
            },
            Math.max(0, at - this.dependencies.now()),
          ) ?? null)
  }

  private expire(): void {
    for (const [peer, registration] of this.peers)
      if (registration.deadline <= this.dependencies.now()) this.close(peer)
  }

  private async recheck(): Promise<void> {
    this.checking = true
    const startedAt = this.dependencies.now()
    const snapshot = [...this.peers.entries()]
    for (const [peer, registration] of snapshot) {
      registration.checkAt = startedAt + CONNECTION_CHECK_MS
      this.save(peer)
    }
    this.schedule()
    await this.pending
    try {
      const result = await this.dependencies.readConnectionAccess(
        snapshot.map(([, registration]) => registration.identity),
        startedAt,
      )
      const allowed = new Map(
        result.map((value) => [value.connectionNumber, value.deadline]),
      )
      snapshot.forEach(([peer, registration], index) => {
        if (this.peers.get(peer) !== registration) return
        const deadline = allowed.get(index) ?? 0
        if (
          registration.deadline <= this.dependencies.now() ||
          deadline <= this.dependencies.now()
        )
          this.close(peer)
        else {
          registration.deadline = deadline
          this.save(peer)
        }
      })
    } catch {
      for (const [peer, registration] of snapshot)
        if (this.peers.get(peer) === registration) this.close(peer)
    } finally {
      this.checking = false
      this.schedule()
      await this.pending
    }
  }

  private close(peer: BrowserPeer): void {
    if (!this.peers.has(peer)) return
    this.remove(peer)
    try {
      peer.close()
    } catch {
      /* The peer has already disconnected. */
    }
  }
}
