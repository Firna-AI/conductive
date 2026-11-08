import type { WorkspaceEventEnvelope } from '../../src/shared/events'
import { HttpError } from '../http'
import {
  CONNECTION_CHECK_MS,
  type ConnectionIdentity,
} from '../security/connection-access'
import type { BrowserPeer, ChatDependencies } from './types'

interface BrowserRegistration {
  identity: ConnectionIdentity
  deadline: number
}

type TabDependencies = Pick<
  ChatDependencies,
  'now' | 'scheduleBrowserCheck' | 'readConnectionAccess'
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

/** The same authenticated registration serves native sockets and test peers. */
export class BrowserTabs {
  private readonly peers = new Map<BrowserPeer, BrowserRegistration>()
  private readonly tabIds = new Map<BrowserPeer, string>()
  private cancelPoll: (() => void) | null = null
  private cancelExpiry: (() => void) | null = null
  private checking = false
  private readonly dependencies: TabDependencies

  closeAll(): void {
    for (const peer of this.peers.keys()) this.close(peer)
  }

  constructor(dependencies: TabDependencies) {
    this.dependencies = dependencies
  }

  async add(
    peer: BrowserPeer,
    identity: ConnectionIdentity,
    tabId?: string,
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
    this.peers.set(peer, { identity, deadline: access.deadline })
    if (tabId) this.tabIds.set(peer, tabId)
    this.schedulePoll(CONNECTION_CHECK_MS)
    this.scheduleExpiry()
    return () => this.remove(peer)
  }

  check(peer: BrowserPeer): void {
    const registration = this.peers.get(peer)
    if (!registration || registration.deadline <= this.dependencies.now()) {
      this.close(peer)
      throw accessLost()
    }
  }

  publish(events: readonly WorkspaceEventEnvelope[]): void {
    for (const envelope of events) {
      for (const peer of this.peers.keys()) {
        try {
          this.check(peer)
          peer.send({ type: 'event', envelope })
        } catch {
          this.close(peer)
        }
      }
    }
  }

  private schedulePoll(delay: number): void {
    if (this.checking || this.cancelPoll || this.peers.size === 0) return
    this.cancelPoll = this.dependencies.scheduleBrowserCheck(
      () => this.recheck(),
      delay,
    )
  }

  private scheduleExpiry(): void {
    this.cancelExpiry?.()
    this.cancelExpiry = null
    if (!this.peers.size) return
    const earliest = Math.min(
      ...[...this.peers.values()].map((value) => value.deadline),
    )
    this.cancelExpiry = this.dependencies.scheduleBrowserCheck(
      async () => {
        this.cancelExpiry = null
        for (const [peer, registration] of this.peers)
          if (registration.deadline <= this.dependencies.now()) this.close(peer)
        this.scheduleExpiry()
      },
      Math.max(0, earliest - this.dependencies.now()),
    )
  }

  private async recheck(): Promise<void> {
    this.cancelPoll = null
    this.checking = true
    const startedAt = this.dependencies.now()
    const snapshot = [...this.peers.entries()]
    if (snapshot.length === 0) {
      this.checking = false
      return
    }
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
        if (deadline <= this.dependencies.now()) this.close(peer)
        else registration.deadline = deadline
      })
    } catch {
      for (const [peer, registration] of snapshot)
        if (this.peers.get(peer) === registration) this.close(peer)
    } finally {
      this.checking = false
      this.scheduleExpiry()
      this.schedulePoll(
        Math.max(
          0,
          CONNECTION_CHECK_MS - (this.dependencies.now() - startedAt),
        ),
      )
    }
  }

  private remove(peer: BrowserPeer): void {
    const registration = this.peers.get(peer)
    const tabId = this.tabIds.get(peer)
    this.peers.delete(peer)
    this.tabIds.delete(peer)
    if (registration && tabId && this.dependencies.browserClosed) {
      const closed = this.dependencies.browserClosed(
        registration.identity.workspaceId,
        tabId,
      )
      if (this.dependencies.waitUntil) this.dependencies.waitUntil(closed)
      else void closed.catch(() => undefined)
    }
    if (this.peers.size === 0) {
      this.cancelPoll?.()
      this.cancelPoll = null
    }
    this.scheduleExpiry()
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
