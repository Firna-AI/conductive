import { createChatApi, type WorkspaceTarget } from '../api/client'
import type { SessionReads } from '../links/session-reads'
import { watchSettling } from '../secrets/settling-reads'
import { browserTimers } from '../stream/workspace-stream'
import {
  initialSnapshot,
  type ChatSnapshot,
  type Overlay,
} from './chat-snapshot'
import { ChatStore } from './chat-store'
import { isArchived } from './archive-view'
import type { ChatContext } from './context'
import {
  createChatContext,
  type ChatContextOptions,
} from './controller-context'
import { withEndedDraftFiles } from './drafts'
import { watchShownSession } from './history'
import { loadChat } from './load'
import { followSources, withSources } from './sources'
import { ownWorkspaceList, type WorkspaceList } from './workspace-list'

export interface ChatControllerOptions extends ChatContextOptions {
  /**
   * Whether the host shows the workspace read-only, such as while its org
   * is suspended. The controller reads it at each action, because a
   * suspension can start during a visit.
   */
  readOnly?: () => boolean
}

/**
 * The runs of the chat of one workspace, which `ChatController` gives the
 * actions of the user: the store of the snapshot, the context of the run
 * that each action runs against, and `start`, `stop`, `show`, and `hide`.
 * Each `start` begins a fresh run, and `stop` makes late responses of the
 * run change nothing.
 */
export class ChatRuns {
  /** The org and the workspace of the chat. */
  readonly target: WorkspaceTarget
  /**
   * The workspaces whose links show as chips. The chat watches them while
   * it shows, from `start` or `show` to `hide` or `stop`.
   */
  readonly workspaceList: WorkspaceList
  private readonly options: ChatControllerOptions
  protected readonly store = new ChatStore()
  /** The reader's place in each session tab, while the app keeps the chat. */
  readonly places = this.store.places
  protected context: ChatContext
  private run = 0
  private started = false
  private unwatch: (() => void) | null = null
  private unfollow: (() => void) | null = null
  private unlist: (() => void) | null = null
  private readonly missingNotices = new Set<() => void>()

  constructor(options: ChatControllerOptions) {
    this.options = options
    this.target = options.target
    this.context = this.createContext(this.run)
    const { sources, client, target } = options
    this.workspaceList = sources
      ? { workspaces: sources.workspaces, watch: sources.watchWorkspaces }
      : ownWorkspaceList(
          createChatApi(client, target),
          options.timers ?? browserTimers,
        )
  }

  readonly subscribe = (listener: () => void) => this.store.subscribe(listener)
  readonly getSnapshot = (): ChatSnapshot => this.store.get()

  /** The notice owns its watch until its cleanup or the end of this run. */
  readonly watchMissingLogin = (): (() => void) => {
    const unwatch = this.options.sources?.watchMissingLogin?.()
    const stop = () => {
      if (!this.missingNotices.delete(stop)) return
      unwatch?.()
    }
    this.missingNotices.add(stop)
    return stop
  }

  /** The reads of the sessions of linked workspaces for this load. */
  get sessionReads(): SessionReads {
    return this.context.sessionReads
  }

  /**
   * Loads the chat, then opens its stream. From now on, each session that
   * becomes the shown session loads its history, and the requests that an
   * Allow settles get their read, as `watchSettling` says.
   */
  readonly start = (): Promise<void> => {
    this.stop()
    this.started = true
    this.context = this.createContext(this.run)
    const { sources } = this.options
    const fresh = { ...initialSnapshot, draftEpoch: this.run }
    // The values of the app replace the reset ones at once, then follow it.
    this.store.update(() => (sources ? withSources(fresh, sources) : fresh))
    this.unfollow = sources ? followSources(this.store, sources) : null
    const unwatchShown = watchShownSession(this.context)
    const unwatchSettling = watchSettling(this.context)
    this.unwatch = () => {
      unwatchShown()
      unwatchSettling()
    }
    this.unlist = this.workspaceList.watch()
    return loadChat(this.context)
  }

  readonly stop = (): void => {
    this.run += 1
    for (const stop of this.missingNotices) stop()
    this.context.sessionReads.close()
    for (const upload of this.context.uploads.values()) upload.abort()
    this.context.uploads.clear()
    this.store.update(withEndedDraftFiles)
    this.unwatch?.()
    this.unwatch = null
    this.unfollow?.()
    this.unfollow = null
    this.unlist?.()
    this.unlist = null
    this.context.stream.stop()
  }

  /**
   * Shows the chat. The first show loads it, as `start` does, and so does a
   * show after a failed load. A later show opens the stream again after its
   * cursor, so the chat shows at once and gets only the newer events. A load
   * that still runs keeps going, and its end opens the stream.
   */
  readonly show = (): void => {
    if (!this.started || this.store.get().load.state === 'failed') {
      void this.start()
      return
    }
    this.context.stream.release()
    this.unlist ??= this.workspaceList.watch()
  }

  /**
   * Closes the stream while the app shows another page. The chat keeps its
   * sessions, drafts, transcripts, and cursor, and the actions and loads that
   * run still finish.
   */
  readonly hide = (): void => {
    this.context.stream.hold()
    this.unlist?.()
    this.unlist = null
  }

  private createContext(run: number): ChatContext {
    const live = () => this.run === run
    return createChatContext(this.options, this.store, live, run)
  }

  protected overlay(overlay: Overlay): void {
    this.store.update((snapshot) => ({ ...snapshot, overlay }))
  }

  /**
   * A read-only workspace, archived or shown read-only by the host, changes
   * its tabs in the browser only, and sends no write.
   */
  protected readOnly(): boolean {
    return isArchived(this.store.get()) || (this.options.readOnly?.() ?? false)
  }

  /** Runs a write of the user, unless the workspace is read-only. */
  protected write(action: () => Promise<unknown>): Promise<void> {
    return this.readOnly() ? Promise.resolve() : action().then(() => undefined)
  }
}
