import type { TranscriptDetail } from '../../shared/generated/TranscriptDetail'
import type { ExplainSessionRequest } from '../../shared/sessions'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { IntakeRefusals } from '../../app/draft-files'
import type { DeviceApprovalAction } from '../../shared/device'
import type { AnswerSecretRequest } from '../../shared/secret-requests'

import type { WorkspaceTab, WorkspaceView } from '../../shared/workspace-view'
import { answerCommand, refreshDevices } from '../device/device-actions'
import { answerSecret } from '../secrets/secret-actions'
import type { MentionTarget } from '../mentions/MentionsContext'
import { copyTranscript, type CopyServices } from '../transcript-copy'
import { showAddressSession } from './address-session'
import { closeLocally, showLocally } from './archive-view'
import { attachFiles } from './attachment-actions'
import { ChatRuns } from './chat-runs'
import type { MentionRequest } from './chat-snapshot'
import { hydrate } from './history'
import type { SendingView } from './linked-replies'
import {
  interruptTurn,
  resumeWorkspace,
  retryTurn,
  sendDraft,
  setDraftText,
} from './message-actions'
import { addToChat, takeMention } from './mention-actions'
import { chooseModel } from './model-actions'
import { draftFileSource } from './draft-file-source'
import {
  addEarlierText,
  explainQuote,
  sendFollowUp,
  type ExplainOutcome,
} from './explain-actions'
import { sendPrompt, type PromptOutcome } from './prompt-actions'
import { moveTab } from './tab-actions'
import type { TabPlace } from './tab-order'
import { confirmClose, requestClose } from './close-actions'
import {
  newSession,
  renameSession,
  reopenSession,
  selectSession,
  updateView,
} from './session-actions'

/**
 * The chat of one workspace. It loads the sessions and the history of the
 * shown session, reads the workspace stream, and runs the user's actions
 * against the API. React reads it through `subscribe` and `getSnapshot`.
 * Each `start` begins a fresh run, and `stop` makes late responses of the
 * run change nothing. An app that keeps the chat while it shows another page
 * calls `hide` and `show` instead, as `show` says. `ChatRuns` holds the
 * runs, and this class adds the actions.
 */
export class ChatController extends ChatRuns {
  readonly select = (sessionId: string) =>
    this.readOnly()
      ? showLocally(this.context, sessionId)
      : selectSession(this.context, sessionId)
  /**
   * Shows or reopens the addressed session, as `showAddressSession` says.
   * An aborted signal makes the pending lookup show nothing.
   */
  readonly showAddress = (sessionId: string, signal: AbortSignal) =>
    showAddressSession(
      this.context,
      sessionId,
      () => !signal.aborted,
      (id) => void this.select(id),
      this.reopen,
    )
  readonly newSession = () => this.write(() => newSession(this.context))
  readonly startRename = (sessionId: string) =>
    this.overlay({ kind: 'rename', sessionId })
  readonly rename = (sessionId: string, title: string) =>
    this.write(() => renameSession(this.context, sessionId, title))
  readonly requestClose = async (...sessionIds: string[]): Promise<void> => {
    if (!this.readOnly()) return requestClose(this.context, sessionIds)
    for (const id of sessionIds) closeLocally(this.context, id)
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
  /** Loads the stored history of a session once, such as for its popover. */
  readonly readHistory = (sessionId: string) => hydrate(this.context, sessionId)
  readonly setDraft = (sessionId: string, text: string) =>
    setDraftText(this.context, sessionId, text)
  readonly attachFiles = (
    sessionId: string,
    files: readonly File[],
    refusals?: IntakeRefusals,
  ) =>
    this.readOnly() ? [] : attachFiles(this.context, sessionId, files, refusals)
  /** A field follows its draft identity, also during a move before React renders. */
  readonly draftFiles = (draftId: string) =>
    draftFileSource(
      () => this.context,
      draftId,
      () => this.readOnly(),
    )
  readonly send = (sessionId: string) =>
    this.write(() => sendDraft(this.context, sessionId))
  /** Sends a fixed prompt to the session of the chat, as `sendPrompt` says. */
  readonly sendPrompt = (text: string): Promise<PromptOutcome | null> =>
    this.readOnly()
      ? Promise.resolve('unavailable')
      : sendPrompt(this.context, text)
  /**
   * Puts the chip of a file or a folder into the message field of the
   * session of the chat, as `addToChat` says. A read-only workspace takes
   * no chip.
   */
  readonly addToChat = (target: MentionTarget) =>
    this.write(() => addToChat(this.context, target))
  /** The message field took the chip of a request, as `takeMention` says. */
  readonly takeMention = (request: MentionRequest) =>
    takeMention(this.context, request)
  /**
   * Starts an explanation of a quote, as `explainQuote` says, and gives how
   * it ended. A read-only workspace starts none.
   */
  readonly explain = (
    parentId: string,
    request: ExplainSessionRequest,
  ): Promise<ExplainOutcome> =>
    this.readOnly()
      ? Promise.resolve({ kind: 'refused' })
      : explainQuote(this.context, parentId, request)
  /** A new ID for the written prompt of a start, as `explainQuote` says. */
  readonly newPromptId = (): string => this.context.newId()
  /** Puts late text before the draft of a session, as `addEarlierText` says. */
  readonly addEarlierText = (sessionId: string, text: string) =>
    addEarlierText(this.context, sessionId, text)
  /**
   * Sends the draft of a session from the popover of an explanation, `view`,
   * as `sendFollowUp` says.
   */
  readonly followUp = (sessionId: string, view: SendingView) =>
    this.write(() => sendFollowUp(this.context, sessionId, view))
  /**
   * Try again of a failed turn, as `retryTurn` says. The shown tab follows
   * a linked session, or `view` when Try again was in it, such as the
   * popover of an explanation.
   */
  readonly retry = (sessionId: string, messageId: string, view?: SendingView) =>
    this.write(() => retryTurn(this.context, sessionId, messageId, view))
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
  /** Sends the answer of a member to a secret request, as `answerSecret` says. */
  readonly answerSecret = (requestId: string, answer: AnswerSecretRequest) =>
    this.write(() => answerSecret(this.context, requestId, answer))
  /**
   * Changes the saved view with a change of the app, such as an open file
   * tab, through the one writer of the view. Until the load reads the view,
   * it changes nothing, so the saved tabs stay. A read-only workspace keeps
   * the change in the browser and sends no write.
   */
  readonly updateView = (change: (view: WorkspaceView) => WorkspaceView) =>
    updateView(this.context, change, !this.readOnly())
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
}
