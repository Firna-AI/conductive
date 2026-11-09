import type { Delay } from '../app/events'
import type {
  WorkspaceEventEnvelope,
  WorkspaceSocketMessage,
} from '../shared/events'
import { sameGitHubState } from '../shared/github-state'
import {
  GitHubLoadError,
  loadGitHubSnapshot,
  type FetchLike,
  type GitHubSnapshot,
  type WorkspaceTarget,
} from './githubClient'

/**
 * The event stream of one workspace after `afterEventNumber`. It sends the
 * stored history first, in one or more `history` pages, then live events.
 * The pages of one replay share one cutoff, and a page can leave out event
 * numbers. A page with more to come has `hasMore` and `nextAfterEventNumber`.
 * The returned function ends the subscription.
 * @public The workspace GitHub adapter imports this subscription boundary.
 */
export type SubscribeToWorkspace = (
  afterEventNumber: number,
  listener: (message: WorkspaceSocketMessage) => void,
) => () => void

export interface GitHubSource {
  fetch: FetchLike
  subscribe: SubscribeToWorkspace
  /** Runs the next fresh read later: `AppServices.delay` in the app. */
  delay: Delay
}

/**
 * The wait before the next fresh read of an open workspace, in ms. GitHub
 * events keep the state current, so these reads only catch a change that no
 * webhook names. Each read costs GitHub API calls in every open tab, so the
 * wait is long. It is a choice of the app, not a product limit.
 */
const freshReadWait = 300_000

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
 *
 * While connected, the timer of the next fresh read waits whenever no read
 * runs. It starts when a read ends or a live event cancels a read, and each
 * read stops it. So a timed read never overlaps or cancels another read. A
 * live event keeps a timer that waits, so events never put off the reads.
 */
export class GitHubStore {
  readonly target: WorkspaceTarget
  private state: GitHubState = { status: 'loading' }
  private readonly listeners = new Set<() => void>()
  private source: GitHubSource | null = null
  /** The last event number of the workspace stream that the store read. */
  private lastEventNumber = 0
  /** The cutoff of a replay that has more pages to come, or null. */
  private replay: number | null = null
  /** The newest GitHub state of the pages of a replay so far. */
  private replayed: GitHubSnapshot | null = null
  /** The live events that wait for the final page of a replay. */
  private waiting: WorkspaceEventEnvelope[] = []
  /** Whether the shown state came from a read, not from the stream. */
  private shownFromRead = false
  private running: Read | null = null
  /** Cancels the timer of the next fresh read, while one waits. */
  private cancelTimer: (() => void) | null = null

  constructor(target: WorkspaceTarget) {
    this.target = target
  }

  getSnapshot = (): GitHubState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Starts the first API read and the stream until the returned function
   * disconnects. Until then, the store also reads again after a slow wait,
   * so a change that no event names shows too.
   */
  connect(source: GitHubSource): () => void {
    this.source = source
    this.replay = null
    this.replayed = null
    this.waiting = []
    const unsubscribe = source.subscribe(this.lastEventNumber, this.receive)
    void this.load()
    return () => {
      unsubscribe()
      if (this.source !== source) return
      this.source = null
      this.cancelRead()
      this.stopTimer()
    }
  }

  /** Reads the banner and the checks. It settles after the reply is handled. */
  load(): Promise<void> {
    return this.read(false)
  }

  retry = (): Promise<void> => this.load()

  /**
   * The timed read. It shows no loading, and a failure keeps the state. No
   * read runs now, because each read stops the timer.
   */
  private refresh = (): Promise<void> => {
    this.cancelTimer = null
    return this.read(true)
  }

  private read(timed: boolean): Promise<void> {
    const source = this.source
    if (!source) return Promise.resolve()
    this.cancelRead()
    this.stopTimer()
    const read: Read = { controller: new AbortController(), sawHistory: false }
    this.running = read
    if (!timed && this.state.status === 'error') this.set({ status: 'loading' })
    return loadGitHubSnapshot(
      source.fetch,
      this.target,
      read.controller.signal,
    ).then(
      (reply) => {
        if (this.running !== read) return
        this.running = null
        this.readReply(reply, read.sawHistory)
        this.schedule()
      },
      (error: unknown) => {
        if (this.running !== read) return
        this.running = null
        this.schedule()
        // GitHub events keep a shown state current, so it stays. A timed
        // read also keeps a shown error, and Try again still reads.
        if (this.state.status === 'ready') return
        if (timed && this.state.status === 'error') return
        const message =
          error instanceof GitHubLoadError ? error.userMessage : null
        this.set({ status: 'error', message })
      },
    )
  }

  /**
   * Takes a live event, or one page of the stored history. The pages of one
   * replay share a cutoff, and a page can leave out numbers. The newest state
   * of the pages shows as history after the final page. Live events wait
   * until then, in their order.
   */
  private receive = (message: WorkspaceSocketMessage): void => {
    if (message.type === 'event') {
      if (this.replay !== null) this.waiting.push(message.envelope)
      else this.live(message.envelope)
      return
    }
    const { history } = message
    for (const envelope of history.events) {
      if (envelope.eventNumber > history.throughEventNumber) continue
      this.replayed = this.next(envelope) ?? this.replayed
    }
    if (history.hasMore) {
      this.replay = history.throughEventNumber
      this.lastEventNumber = Math.max(
        this.lastEventNumber,
        Math.min(history.nextAfterEventNumber, history.throughEventNumber),
      )
      return
    }
    this.replay = null
    this.lastEventNumber = Math.max(
      this.lastEventNumber,
      history.throughEventNumber,
    )
    const latest = this.replayed
    this.replayed = null
    if (latest) this.readHistory(latest)
    const waiting = this.waiting.sort((a, b) => a.eventNumber - b.eventNumber)
    this.waiting = []
    for (const envelope of waiting) this.live(envelope)
  }

  private live(envelope: WorkspaceEventEnvelope): void {
    const live = this.next(envelope)
    if (!live) return
    // A live event is newer than the reply of any read that runs.
    this.cancelRead()
    this.show(live, false)
    this.schedule()
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

  /** Starts the timer of the next fresh read, unless one waits or a read runs. */
  private schedule(): void {
    const source = this.source
    if (!source || this.running || this.cancelTimer) return
    this.cancelTimer = source.delay(freshReadWait, this.refresh)
  }

  private stopTimer(): void {
    this.cancelTimer?.()
    this.cancelTimer = null
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
