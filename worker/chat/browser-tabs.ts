import type { WorkspaceEventEnvelope } from '../../src/shared/events'
import type { BrowserIdentity, BrowserPeer, ChatDependencies } from './types'

const RECHECK_MS = 30_000

/** The same authenticated registration serves native sockets and test peers. */
export class BrowserTabs {
  private readonly peers = new Map<BrowserPeer, BrowserIdentity>()
  private cancelTimer: (() => void) | null = null
  private checking = false
  private readonly dependencies: Pick<
    ChatDependencies,
    'now' | 'scheduleBrowserCheck' | 'readBrowserAccess'
  >

  constructor(
    dependencies: Pick<
      ChatDependencies,
      'now' | 'scheduleBrowserCheck' | 'readBrowserAccess'
    >,
  ) {
    this.dependencies = dependencies
  }

  add(peer: BrowserPeer, identity: BrowserIdentity): () => void {
    this.peers.set(peer, identity)
    this.schedule(RECHECK_MS)
    return () => this.remove(peer)
  }

  publish(events: readonly WorkspaceEventEnvelope[]): void {
    for (const envelope of events) {
      for (const peer of this.peers.keys()) {
        try {
          peer.send({ type: 'event', envelope })
        } catch {
          this.close(peer)
        }
      }
    }
  }

  private schedule(delay: number): void {
    if (this.checking || this.cancelTimer || this.peers.size === 0) return
    this.cancelTimer = this.dependencies.scheduleBrowserCheck(
      () => this.recheck(),
      delay,
    )
  }

  private async recheck(): Promise<void> {
    this.cancelTimer = null
    this.checking = true
    const startedAt = this.dependencies.now()
    const snapshot = [...this.peers.entries()]
    if (snapshot.length === 0) {
      this.checking = false
      return
    }
    let allowed = new Set<number>()
    try {
      allowed = new Set(
        await this.dependencies.readBrowserAccess(
          snapshot.map(([, identity]) => identity),
          startedAt,
        ),
      )
    } catch {
      // A failed access read cannot authorize continued delivery.
    }
    snapshot.forEach(([peer, identity], index) => {
      if (!allowed.has(index) && this.peers.get(peer) === identity)
        this.close(peer)
    })
    this.checking = false
    this.schedule(
      Math.max(0, RECHECK_MS - (this.dependencies.now() - startedAt)),
    )
  }

  private remove(peer: BrowserPeer): void {
    this.peers.delete(peer)
    if (this.peers.size === 0) {
      this.cancelTimer?.()
      this.cancelTimer = null
    }
  }

  private close(peer: BrowserPeer): void {
    this.remove(peer)
    try {
      peer.close()
    } catch {
      /* The peer has already disconnected. */
    }
  }
}
