import type {
  WorkspaceEventEnvelope,
  WorkspaceSocketMessage,
} from '../shared/events'
import {
  GitHubLoadError,
  loadGitHubSnapshot,
  type FetchLike,
  type GitHubSnapshot,
  type WorkspaceTarget,
} from './githubClient'

/**
 * The event stream of one workspace. The first message holds the stored
 * history after `afterEventNumber`. Later messages hold live events. The
 * returned function ends the subscription.
 */
export type SubscribeToWorkspace = (
  afterEventNumber: number,
  listener: (message: WorkspaceSocketMessage) => void,
) => () => void

export interface GitHubSource {
  fetch: FetchLike
  subscribe: SubscribeToWorkspace
}

export type GitHubState =
  | { status: 'loading' }
  | { status: 'error'; message: string | null }
  | { status: 'ready'; snapshot: GitHubSnapshot }

/** What the bar, the row, and the Checks tab read. */
export interface GitHubFeed {
  state: GitHubState
  retry: () => void
}

/**
 * The GitHub state of one workspace. It reads the banner and the checks from
 * the API, and each `github.updated` event of the workspace stream. Events
 * apply in the order of their numbers. Between an event and a load reply,
 * the newer `banner.updatedAt` wins, because the stored history of a socket
 * can arrive before, during, or after a load. On a tie, a live event that
 * arrived during the load wins, and the load wins over history.
 */
export class GitHubStore {
  readonly target: WorkspaceTarget
  private state: GitHubState = { status: 'loading' }
  private readonly listeners = new Set<() => void>()
  private source: GitHubSource | null = null
  /** The last event number of the workspace stream that the store read. */
  private lastEventNumber = 0
  /** The number of live GitHub events that the store read. */
  private liveEvents = 0
  /** When the shown state came from a load, the time of its banner. */
  private loadedAt: number | null = null
  /** Each load has its number. Only the reply of the newest load counts. */
  private loadNumber = 0
  private controller: AbortController | null = null

  constructor(target: WorkspaceTarget) {
    this.target = target
  }

  getState = (): GitHubState => this.state

  listen = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Reads the event stream until the returned function disconnects. */
  connect(source: GitHubSource): () => void {
    this.source = source
    const unsubscribe = source.subscribe(this.lastEventNumber, this.receive)
    return () => {
      unsubscribe()
      if (this.source !== source) return
      this.source = null
      this.cancelLoad()
    }
  }

  /** Reads the banner and the checks. It settles after the reply applies. */
  load(): Promise<void> {
    const source = this.source
    if (!source) return Promise.resolve()
    this.cancelLoad()
    const loadNumber = this.loadNumber
    const liveEvents = this.liveEvents
    const controller = new AbortController()
    this.controller = controller
    if (this.state.status === 'error') this.set({ status: 'loading' })
    return loadGitHubSnapshot(source.fetch, this.target, controller.signal)
      .then(
        (snapshot) => {
          if (loadNumber !== this.loadNumber) return
          if (!this.replyIsNewer(snapshot, liveEvents)) return
          this.show(snapshot, snapshot.banner.updatedAt)
        },
        (error: unknown) => {
          if (loadNumber !== this.loadNumber) return
          // GitHub events keep a shown state current, so it stays.
          if (this.state.status === 'ready') return
          const message =
            error instanceof GitHubLoadError ? error.userMessage : null
          this.set({ status: 'error', message })
        },
      )
      .finally(() => {
        if (this.controller === controller) this.controller = null
      })
  }

  retry = (): Promise<void> => this.load()

  private receive = (message: WorkspaceSocketMessage): void => {
    if (message.type === 'event') {
      this.read(message.envelope, true)
      return
    }
    for (const envelope of message.history.events) this.read(envelope, false)
    this.lastEventNumber = Math.max(
      this.lastEventNumber,
      message.history.throughEventNumber,
    )
  }

  /** Skips other workspaces, repeated events, and events older than the last. */
  private read(envelope: WorkspaceEventEnvelope, live: boolean): void {
    if (envelope.workspaceId !== this.target.workspaceId) return
    if (envelope.eventNumber <= this.lastEventNumber) return
    this.lastEventNumber = envelope.eventNumber
    const { event } = envelope
    if (event.type !== 'github.updated') return
    if (live) this.liveEvents += 1
    const time = event.banner.updatedAt
    // A newer load reply stays. A live event wins a tie, and history does not.
    const loadedAt = this.loadedAt
    if (loadedAt !== null && (time < loadedAt || (time === loadedAt && !live)))
      return
    this.show({ banner: event.banner, checks: event.checks }, null)
  }

  /** Whether a load reply is newer than the shown state. */
  private replyIsNewer(snapshot: GitHubSnapshot, liveEvents: number): boolean {
    if (this.state.status !== 'ready') return true
    const time = snapshot.banner.updatedAt
    const shownAt = this.state.snapshot.banner.updatedAt
    if (time !== shownAt) return time > shownAt
    // On a tie, a live event that arrived during the load is the newer state.
    return liveEvents === this.liveEvents
  }

  private cancelLoad(): void {
    this.loadNumber += 1
    this.controller?.abort()
    this.controller = null
  }

  private show(snapshot: GitHubSnapshot, loadedAt: number | null): void {
    this.loadedAt = loadedAt
    this.set({ status: 'ready', snapshot })
  }

  private set(state: GitHubState): void {
    this.state = state
    for (const listener of this.listeners) listener()
  }
}
