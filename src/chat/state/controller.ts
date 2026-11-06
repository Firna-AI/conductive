import type { AgentChoice } from '../../shared/agents'
import {
  createChatApi,
  type FetchLike,
  type WorkspaceTarget,
} from '../api/client'
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
import { applyEnvelopes, viewWriter, type ChatContext } from './context'
import { hydrate, watchShownSession } from './history'
import { loadChat } from './load'
import {
  attachFiles,
  interruptTurn,
  removeAttachment,
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
} from './session-actions'

export interface ChatControllerOptions {
  target: WorkspaceTarget
  /** The browser's `fetch` in the app, or the fake API's `fetch`. */
  fetch: FetchLike
  /** Opens the workspace event stream: the app's socket, or the fake's events. */
  subscribe: SubscribeToWorkspace
  timers?: StreamTimers
  newId?: () => string
}

/**
 * The chat of one workspace. It loads the sessions and the history of the
 * shown session, reads the workspace stream, and runs the user's actions
 * against the API. React reads it through `subscribe` and `getSnapshot`.
 * Each `start` begins a fresh run, and `stop` makes late responses of the
 * run change nothing.
 */
export class ChatController {
  private readonly options: ChatControllerOptions
  private readonly store = new ChatStore()
  private context: ChatContext
  private run = 0
  private unwatch: (() => void) | null = null

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
    this.context = this.createContext(this.run)
    this.store.update(() => initialSnapshot)
    this.unwatch = watchShownSession(this.context)
    return loadChat(this.context)
  }

  readonly stop = (): void => {
    this.run += 1
    this.unwatch?.()
    this.unwatch = null
    this.context.stream.stop()
  }

  private createContext(run: number): ChatContext {
    const { target, subscribe, timers } = this.options
    const api = createChatApi(this.options.fetch, target)
    const live = () => this.run === run
    let drafts = 0
    const context: ChatContext = {
      target,
      api,
      store: this.store,
      logs: new Map(),
      loading: new Map(),
      versions: new Map(),
      picks: new Map(),
      moves: new Map(),
      newId: this.options.newId ?? (() => crypto.randomUUID()),
      newDraftId: () => {
        drafts += 1
        return `draft-${drafts}`
      },
      saveView: viewWriter((view) => api.saveView(view)),
      live,
      stream: new WorkspaceStream({
        target,
        subscribe,
        timers,
        deliver: (envelopes) => {
          if (live()) applyEnvelopes(context, envelopes)
        },
      }),
    }
    return context
  }

  private overlay(overlay: Overlay): void {
    this.store.update((snapshot) => ({ ...snapshot, overlay }))
  }

  readonly select = (sessionId: string) =>
    selectSession(this.context, sessionId)
  readonly newSession = () => newSession(this.context)
  readonly startRename = (sessionId: string) =>
    this.overlay({ kind: 'rename', sessionId })
  readonly rename = (sessionId: string, title: string) =>
    renameSession(this.context, sessionId, title)
  readonly requestClose = (sessionId: string) =>
    requestClose(this.context, sessionId)
  readonly confirmClose = () => confirmClose(this.context)
  readonly showHistory = (open: boolean) =>
    this.overlay(open ? { kind: 'history' } : { kind: 'none' })
  readonly dismissOverlay = () => this.overlay({ kind: 'none' })
  readonly reopen = (sessionId: string) =>
    reopenSession(this.context, sessionId)
  readonly loadHistory = (sessionId: string) =>
    hydrate(this.context, sessionId, true)
  readonly setDraft = (sessionId: string, text: string) =>
    setDraftText(this.context, sessionId, text)
  readonly attachFiles = (sessionId: string, files: readonly File[]) =>
    attachFiles(this.context, sessionId, files)
  readonly removeAttachment = (sessionId: string, attachmentId: string) =>
    removeAttachment(this.context, sessionId, attachmentId)
  readonly send = (sessionId: string) => sendDraft(this.context, sessionId)
  readonly retry = (sessionId: string, messageId: string) =>
    retryTurn(this.context, sessionId, messageId)
  readonly interrupt = (sessionId: string) =>
    interruptTurn(this.context, sessionId)
  readonly chooseModel = (sessionId: string, choice: AgentChoice) =>
    chooseModel(this.context, sessionId, choice)
  readonly resume = () => resumeWorkspace(this.context)
  readonly dismissNotice = () =>
    this.store.update((snapshot) => ({ ...snapshot, notice: null }))
}
