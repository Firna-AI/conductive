import type { AgentChoice } from '../../shared/agents'
import type { DeviceApprovalAction } from '../../shared/device'
import type { TranscriptDetail } from '../../shared/sessions'
import type { WorkspaceTab, WorkspaceView } from '../../shared/workspace-view'
import { createChatApi, type WorkspaceTarget } from '../api/client'
import { answerCommand, refreshDevices } from '../device/device-actions'
import { browserTimers } from '../stream/workspace-stream'
import { copyTranscript, type CopyServices } from '../transcript-copy'
import {
  ChatStore,
  initialSnapshot,
  type ChatSnapshot,
  type Overlay,
} from './chat-snapshot'
import { closeLocally, isArchived, showLocally } from './archive-view'
import { attachFiles, removeFile, retryFile } from './attachment-actions'
import type { ChatContext } from './context'
import {
  createChatContext,
  type ChatContextOptions,
} from './controller-context'
import { hydrate, watchShownSession } from './history'
import { loadChat } from './load'
import { followSources, withSources } from './sources'
import {
  interruptTurn,
  resumeWorkspace,
  retryTurn,
  sendDraft,
  setDraftText,
} from './message-actions'
import { chooseModel } from './model-actions'
import { showWhenOpen } from './session-show'
import { moveTab } from './tab-actions'
import type { TabPlace } from './tab-order'
import { ownWorkspaceList, type WorkspaceList } from './workspace-list'
import {
  confirmClose,
  newSession,
  renameSession,
  reopenSession,
  requestClose,
  selectSession,
  updateView,
} from './session-actions'

export interface ChatControllerOptions extends ChatContextOptions {
  /**
   * Whether the host shows the workspace read-only, such as while its org
   * is suspended. The controller reads it at each action, because a
   * suspension can start during a visit.
   */
  readOnly?: () => boolean
}

/**
 * The chat of one workspace. It loads the sessions and the history of the
 * shown session, reads the workspace stream, and runs the user's actions
 * against the API. React reads it through `subscribe` and `getSnapshot`.
 * Each `start` begins a fresh run, and `stop` makes late responses of the
 * run change nothing. An app that keeps the chat while it shows another page
 * calls `hide` and `show` instead, as `show` says.
 */
export class ChatController {
  /** The org and the workspace of the chat. */
  readonly target: WorkspaceTarget
  /**
   * The workspaces whose links show as chips. The chat watches them while
   * it shows, from `start` or `show` to `hide` or `stop`.
   */
  readonly workspaceList: WorkspaceList
  private readonly options: ChatControllerOptions
  private readonly store = new ChatStore()
  private context: ChatContext
  private run = 0
  private started = false
  private unwatch: (() => void) | null = null
  private unfollow: (() => void) | null = null
  private unlist: (() => void) | null = null
  /** The choices of the person in the tabs, which end a show of a session. */
  private choices = 0
  private endShow: (() => void) | null = null

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

  /**
   * Loads the chat, then opens its stream. From now on, each session that
   * becomes the shown session loads its history.
   */
  readonly start = (): Promise<void> => {
    this.stop()
    this.started = true
    this.context = this.createContext(this.run)
    const { sources } = this.options
    // The values of the app replace the reset ones at once, then follow it.
    this.store.update(() =>
      sources ? withSources(initialSnapshot, sources) : initialSnapshot,
    )
    this.unfollow = sources ? followSources(this.store, sources) : null
    this.unwatch = watchShownSession(this.context)
    this.unlist = this.workspaceList.watch()
    return loadChat(this.context)
  }

  readonly stop = (): void => {
    this.run += 1
    this.endShow?.()
    for (const upload of this.context.uploads.values()) upload.abort()
    this.context.uploads.clear()
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
    this.endShow?.()
    this.context.stream.hold()
    this.unlist?.()
    this.unlist = null
  }

  private createContext(run: number): ChatContext {
    return createChatContext(this.options, this.store, () => this.run === run)
  }

  private overlay(overlay: Overlay): void {
    this.store.update((snapshot) => ({ ...snapshot, overlay }))
  }

  /**
   * A read-only workspace, archived or shown read-only by the host, changes
   * its tabs in the browser only, and sends no write.
   */
  private readOnly(): boolean {
    return isArchived(this.store.get()) || (this.options.readOnly?.() ?? false)
  }

  /** Runs a write of the user, unless the workspace is read-only. */
  private write(action: () => Promise<unknown>): Promise<void> {
    return this.readOnly() ? Promise.resolve() : action().then(() => undefined)
  }

  readonly select = (sessionId: string) => {
    this.choices += 1
    return this.readOnly()
      ? showLocally(this.context, sessionId)
      : selectSession(this.context, sessionId)
  }
  readonly newSession = () => {
    this.choices += 1
    return this.write(() => newSession(this.context))
  }
  readonly startRename = (sessionId: string) =>
    this.overlay({ kind: 'rename', sessionId })
  readonly rename = (sessionId: string, title: string) =>
    this.write(() => renameSession(this.context, sessionId, title))
  readonly requestClose = async (sessionId: string): Promise<void> => {
    this.choices += 1
    if (!this.readOnly()) return requestClose(this.context, sessionId)
    closeLocally(this.context, sessionId)
  }
  readonly confirmClose = () => this.write(() => confirmClose(this.context))
  readonly showHistory = (open: boolean) =>
    this.overlay(open ? { kind: 'history' } : { kind: 'none' })
  readonly dismissOverlay = () => this.overlay({ kind: 'none' })
  /** Reopens a closed session, or shows its history in a read-only workspace. */
  readonly reopen = (sessionId: string) => {
    this.choices += 1
    return this.readOnly()
      ? showLocally(this.context, sessionId)
      : reopenSession(this.context, sessionId)
  }
  readonly loadHistory = (sessionId: string) =>
    hydrate(this.context, sessionId, true)
  readonly setDraft = (sessionId: string, text: string) =>
    setDraftText(this.context, sessionId, text)
  readonly attachFiles = (sessionId: string, files: readonly File[]) =>
    this.write(() => attachFiles(this.context, sessionId, files))
  /** Try again on a file whose upload failed. */
  readonly retryFile = (sessionId: string, fileId: string) =>
    this.write(() => retryFile(this.context, sessionId, fileId))
  readonly removeFile = (sessionId: string, fileId: string) =>
    removeFile(this.context, sessionId, fileId)
  readonly send = (sessionId: string) =>
    this.write(() => sendDraft(this.context, sessionId))
  readonly retry = (sessionId: string, messageId: string) =>
    this.write(() => retryTurn(this.context, sessionId, messageId))
  readonly interrupt = (sessionId: string) =>
    this.write(() => interruptTurn(this.context, sessionId))
  readonly chooseModel = (sessionId: string, choice: AgentChoice) =>
    this.write(() => chooseModel(this.context, sessionId, choice))
  readonly resume = () => this.write(() => resumeWorkspace(this.context))
  /** Sends the answer to a Mac command, from the Mac app on that Mac. */
  readonly answerCommand = (requestId: string, action: DeviceApprovalAction) =>
    this.write(() => answerCommand(this.context, requestId, action))
  /** Reads the Mac commands and the pairing again, such as after a failure. */
  readonly loadDevices = () => refreshDevices(this.context)
  /**
   * Changes the saved view with a change of the app, such as an open file
   * tab, through the one writer of the view. Until the load reads the view,
   * it changes nothing, so the saved tabs stay. A read-only workspace keeps
   * the change in the browser and sends no write.
   */
  readonly updateView = (change: (view: WorkspaceView) => WorkspaceView) => {
    const before = this.store.get().view?.activeTab
    updateView(this.context, change, !this.readOnly())
    // A change of the shown tab, such as an open document, is a choice.
    if (this.store.get().view?.activeTab !== before) this.choices += 1
  }
  readonly moveTab = (tab: WorkspaceTab, place: TabPlace): void => {
    if (!this.readOnly()) moveTab(this.context, tab, place)
  }
  /**
   * Copies the transcript of a session, as `copyTranscript` says. Call it
   * during the press, so that its clipboard write starts at once. It only
   * reads, so a read-only workspace copies too, and the shown tab, the
   * view, and the loaded history stay as they are.
   */
  readonly copyTranscript = (
    services: CopyServices,
    sessionId: string,
    detail: TranscriptDetail,
  ): Promise<void> =>
    copyTranscript({
      services,
      api: this.context.api,
      target: this.target,
      sessionId,
      detail,
    })
  readonly dismissNotice = () =>
    this.store.update((snapshot) => ({ ...snapshot, notice: null }))

  /** The count of the choices of the person in the tabs, for `showSession`. */
  readonly choiceCount = (): number => this.choices

  /**
   * Shows a session that the server opened for this person, such as the
   * early session of an Activate reply, once the chat has it open. It makes
   * no session record. A choice in the tabs since `since`, a page in place
   * of the chat, a hide, or a close of the session ends it first.
   */
  readonly showSession = (sessionId: string, since: number): void => {
    this.endShow?.()
    this.endShow = showWhenOpen(
      this.store,
      sessionId,
      () => this.choices === since,
      (id) => void this.select(id),
    )
  }
}
