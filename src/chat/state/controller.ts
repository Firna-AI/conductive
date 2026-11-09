import type { ApiClient } from '../../app/api/client'
import type { AgentChoice } from '../../shared/agents'
import type { DeviceApprovalAction } from '../../shared/device'
import type { WorkspaceView } from '../../shared/workspace-view'
import { createChatApi, type WorkspaceTarget } from '../api/client'
import type { StreamEnvelope } from '../api/read-workspace'
import {
  answerCommand,
  DeviceReads,
  refreshDevices,
} from '../device/device-actions'
import { createDeviceApi } from '../device/device-api'
import {
  WorkspaceStream,
  type StreamTimers,
  type SubscribeToWorkspace,
} from '../stream/workspace-stream'
import {
  ChatStore,
  initialSnapshot,
  type ChatSnapshot,
  type Overlay,
} from './chat-snapshot'
import { closeLocally, isArchived, showLocally } from './archive-view'
import { applyEnvelopes } from './apply-events'
import { attachFiles, removeFile, retryFile } from './attachment-actions'
import { viewWriter, type ChatContext } from './context'
import { hydrate, watchShownSession } from './history'
import { loadChat } from './load'
import { followSources, withSources, type ChatSources } from './sources'
import {
  interruptTurn,
  resumeWorkspace,
  retryTurn,
  sendDraft,
  setDraftText,
} from './message-actions'
import { chooseModel } from './model-actions'
import {
  confirmClose,
  newSession,
  renameSession,
  reopenSession,
  requestClose,
  selectSession,
  updateView,
} from './session-actions'

export interface ChatControllerOptions {
  target: WorkspaceTarget
  /** The JSON client of the app, over the Worker or the fake API. */
  client: ApiClient
  /** Opens the workspace event stream: the app's socket, or the fake's events. */
  subscribe: SubscribeToWorkspace
  timers?: StreamTimers
  newId?: () => string
  /**
   * The inputs that app models own, as `ChatSources` says. Without them,
   * the chat reads the account, the org, the models, and the members itself.
   */
  sources?: ChatSources
  /**
   * Whether the host shows the workspace read-only, such as while its org
   * is suspended. The controller reads it at each action, because a
   * suspension can start during a visit.
   */
  readOnly?: () => boolean
}

/** The Worker records a change of the workspace with each change of a Mac command. */
const changesWorkspace = (envelopes: readonly StreamEnvelope[]) =>
  envelopes.some(({ event }) => event?.type === 'workspace.updated')

/**
 * The chat of one workspace. It loads the sessions and the history of the
 * shown session, reads the workspace stream, and runs the user's actions
 * against the API. React reads it through `subscribe` and `getSnapshot`.
 * Each `start` begins a fresh run, and `stop` makes late responses of the
 * run change nothing. An app that keeps the chat while it shows another page
 * calls `hide` and `show` instead, as `show` says.
 */
export class ChatController {
  private readonly options: ChatControllerOptions
  private readonly store = new ChatStore()
  private context: ChatContext
  private run = 0
  private started = false
  private unwatch: (() => void) | null = null
  private unfollow: (() => void) | null = null

  constructor(options: ChatControllerOptions) {
    this.options = options
    this.context = this.createContext(this.run)
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
    return loadChat(this.context)
  }

  readonly stop = (): void => {
    this.run += 1
    for (const upload of this.context.uploads.values()) upload.abort()
    this.context.uploads.clear()
    this.unwatch?.()
    this.unwatch = null
    this.unfollow?.()
    this.unfollow = null
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
  }

  /**
   * Closes the stream while the app shows another page. The chat keeps its
   * sessions, drafts, transcripts, and cursor, and the actions and loads that
   * run still finish.
   */
  readonly hide = (): void => {
    this.context.stream.hold()
  }

  private createContext(run: number): ChatContext {
    const { target, subscribe, timers } = this.options
    const api = createChatApi(this.options.client, target)
    const live = () => this.run === run
    let drafts = 0
    let files = 0
    const context: ChatContext = {
      target,
      api,
      store: this.store,
      loading: new Map(),
      edits: new Map(),
      workspaceOrder: { through: 0 },
      picks: new Map(),
      moves: new Map(),
      newId: this.options.newId ?? (() => crypto.randomUUID()),
      newDraftId: () => {
        drafts += 1
        return `draft-${drafts}`
      },
      newFileId: () => {
        files += 1
        return `file-${files}`
      },
      uploads: new Map(),
      saveView: viewWriter((view) => api.saveView(view)),
      live,
      owned: this.options.sources !== undefined,
      devices: {
        api: createDeviceApi(this.options.client),
        reads: new DeviceReads(),
      },
      stream: new WorkspaceStream({
        target,
        subscribe,
        timers,
        deliver: (envelopes) => {
          if (!live()) return
          applyEnvelopes(context, envelopes)
          if (changesWorkspace(envelopes)) void refreshDevices(context)
        },
      }),
    }
    return context
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

  readonly select = (sessionId: string) =>
    this.readOnly()
      ? showLocally(this.context, sessionId)
      : selectSession(this.context, sessionId)
  readonly newSession = () => this.write(() => newSession(this.context))
  readonly startRename = (sessionId: string) =>
    this.overlay({ kind: 'rename', sessionId })
  readonly rename = (sessionId: string, title: string) =>
    this.write(() => renameSession(this.context, sessionId, title))
  readonly requestClose = async (sessionId: string): Promise<void> => {
    if (!this.readOnly()) return requestClose(this.context, sessionId)
    closeLocally(this.context, sessionId)
  }
  readonly confirmClose = () => this.write(() => confirmClose(this.context))
  readonly showHistory = (open: boolean) =>
    this.overlay(open ? { kind: 'history' } : { kind: 'none' })
  readonly dismissOverlay = () => this.overlay({ kind: 'none' })
  /** Reopens a closed session, or shows its history in a read-only workspace. */
  readonly reopen = (sessionId: string) =>
    this.readOnly()
      ? showLocally(this.context, sessionId)
      : reopenSession(this.context, sessionId)
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
  readonly updateView = (change: (view: WorkspaceView) => WorkspaceView) =>
    updateView(this.context, change, !this.readOnly())
  readonly dismissNotice = () =>
    this.store.update((snapshot) => ({ ...snapshot, notice: null }))
}
