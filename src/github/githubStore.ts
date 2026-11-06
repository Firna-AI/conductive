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
import { sameGitHubState } from './sameState'

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

/** A read of the banner and the checks that has not answered yet. */
interface Read {
  controller: AbortController
  /** A history came during the read, so the two have no known order. */
  sawHistory: boolean
}

/**
 * The GitHub state of one workspace, from API reads and from the
 * `github.updated` events of the workspace stream. Events apply in the order
 * of their numbers. A live event is the newest state, so it cancels a read
 * that runs. A read that starts after the history returns a state at least
 * as new, because the Worker reads the current state. A history that comes
 * during a read, or after its reply shows, has no known order against that
 * reply: when the two differ, the store keeps what it shows and reads again.
 */
export class GitHubStore {
  readonly target: WorkspaceTarget
  private state: GitHubState = { status: 'loading' }
  private readonly listeners = new Set<() => void>()
  private source: GitHubSource | null = null
  /** The last event number of the workspace stream that the store read. */
  private lastEventNumber = 0
  /** Whether the shown state came from a read, not from the stream. */
  private shownFromRead = false
  private running: Read | null = null

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

  /** Starts the first API read and the stream until the returned function disconnects. */
  connect(source: GitHubSource): () => void {
    this.source = source
    const unsubscribe = source.subscribe(this.lastEventNumber, this.receive)
    void this.load()
    return () => {
      unsubscribe()
      if (this.source !== source) return
      this.source = null
      this.cancelRead()
    }
  }

  /** Reads the banner and the checks. It settles after the reply is handled. */
  load(): Promise<void> {
    const source = this.source
    if (!source) return Promise.resolve()
    this.cancelRead()
    const read: Read = { controller: new AbortController(), sawHistory: false }
    this.running = read
    if (this.state.status === 'error') this.set({ status: 'loading' })
    return loadGitHubSnapshot(
      source.fetch,
      this.target,
      read.controller.signal,
    ).then(
      (reply) => {
        if (this.running !== read) return
        this.running = null
        this.readReply(reply, read.sawHistory)
      },
      (error: unknown) => {
        if (this.running !== read) return
        this.running = null
        // GitHub events keep a shown state current, so it stays.
        if (this.state.status === 'ready') return
        const message =
          error instanceof GitHubLoadError ? error.userMessage : null
        this.set({ status: 'error', message })
      },
    )
  }

  retry = (): Promise<void> => this.load()

  private receive = (message: WorkspaceSocketMessage): void => {
    if (message.type === 'event') {
      const live = this.next(message.envelope)
      if (!live) return
      // A live event is newer than the reply of any read that runs.
      this.cancelRead()
      this.show(live, false)
      return
    }
    let latest: GitHubSnapshot | null = null
    for (const envelope of message.history.events) {
      latest = this.next(envelope) ?? latest
    }
    this.lastEventNumber = Math.max(
      this.lastEventNumber,
      message.history.throughEventNumber,
    )
    if (latest) this.readHistory(latest)
  }

  /**
   * The GitHub state of an envelope that is new in the stream of this
   * workspace. It skips other workspaces and repeated or older numbers.
   */
  private next(envelope: WorkspaceEventEnvelope): GitHubSnapshot | null {
    if (envelope.workspaceId !== this.target.workspaceId) return null
    if (envelope.eventNumber <= this.lastEventNumber) return null
    this.lastEventNumber = envelope.eventNumber
    const { event } = envelope
    if (event.type !== 'github.updated') return null
    return { banner: event.banner, checks: event.checks }
  }

  private readHistory(history: GitHubSnapshot): void {
    if (this.running) this.running.sawHistory = true
    if (this.state.status === 'ready' && this.shownFromRead) {
      // A shown reply and a later history have no known order.
      if (!sameGitHubState(this.state.snapshot, history)) void this.load()
      return
    }
    this.show(history, false)
  }

  private readReply(reply: GitHubSnapshot, sawHistory: boolean): void {
    const shown = this.state.status === 'ready' ? this.state.snapshot : null
    if (sawHistory && shown && !sameGitHubState(shown, reply)) {
      // One more read starts after the history, so its reply shows.
      void this.load()
      return
    }
    this.show(reply, true)
  }

  private cancelRead(): void {
    this.running?.controller.abort()
    this.running = null
  }

  private show(snapshot: GitHubSnapshot, fromRead: boolean): void {
    this.shownFromRead = fromRead
    this.set({ status: 'ready', snapshot })
  }

  private set(state: GitHubState): void {
    this.state = state
    for (const listener of this.listeners) listener()
  }
}
