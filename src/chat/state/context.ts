import { ApiError } from '../../app/api/client'
import type { Delay } from '../../app/events'
import type { ChatApi, WorkspaceTarget } from '../api/client'
import type { DeviceChannel } from '../device/device-actions'
import type { SecretApi } from '../secrets/secret-actions'
import type { SessionReads } from '../links/session-reads'
import type { WorkspaceStream } from '../stream/workspace-stream'
import { withSession, type ChatSnapshot } from './chat-snapshot'
import type { ChatStore } from './chat-store'
import { withLateSends } from './late-sends'
import type { PendingMove } from './model-moves'
import type { PendingEdit } from './session-records'
import type { Transcript } from '../../shared/transcript/transcript'

/** The newest page and the complete history of one shared session load. */
export interface HistoryLoad {
  readonly newest: Promise<number | null>
  readonly complete: Promise<number | null>
}

/** What the chat's actions share: the API, the store, the logs, and the stream. */
export interface ChatContext {
  readonly target: WorkspaceTarget
  readonly api: ChatApi
  readonly store: ChatStore
  readonly stream: WorkspaceStream
  /** The running history load of each session, so that loads are shared. */
  readonly loading: Map<string, HistoryLoad>
  /** The rename, model, and close edits that wait for their replies, by session. */
  readonly edits: Map<string, readonly PendingEdit[]>
  /**
   * The event number of the workspace record that shows, so an older reply
   * or event no longer replaces it, as `workspace-records.ts` says.
   */
  readonly workspaceOrder: { through: number }
  /** The number of the latest model pick of each session. */
  readonly picks: Map<string, number>
  /** The model changes whose new session has not shown yet, by its ID. */
  readonly moves: Map<string, PendingMove>
  readonly newId: () => string
  /**
   * One fixed prompt sends at a time. Its client ID stays by session and
   * text while it sends and after a failure, so a retry is the same message.
   */
  readonly prompts: { sending: boolean; ids: Map<string, string> }
  /** A new identity for a draft that a session starts after its draft moved. */
  readonly newDraftId: () => string
  /** A new local identity for a file of a draft, in this tab. */
  readonly newFileId: () => string
  /**
   * The running and queued upload generations, by file ID. Detach aborts its file,
   * and a stop of the chat aborts each one.
   */
  readonly uploads: Map<string, AbortController>
  /**
   * The timer of the waits before a failed part of an upload goes again: the
   * timers of the chat, which a test gives as manual timers.
   */
  readonly delay: Delay
  readonly saveView: () => void
  /** The chat is still open. A response that arrives later changes nothing. */
  readonly live: () => boolean
  /**
   * App models own the account, the org, the models, and the members, so
   * the load reads none of them, as `ChatSources` says.
   */
  readonly owned: boolean
  /** The routes of Mac commands, and the number of their latest read. */
  readonly devices: DeviceChannel
  /** The routes of secret requests: their list, and the answers. */
  readonly secrets: SecretApi
  /**
   * The one read of the sessions of each other workspace that a session
   * link names, for this run, as `SessionReads` says.
   */
  readonly sessionReads: SessionReads
  /**
   * The choices of a shown session in this run, so that an address lookup
   * that a later choice overtook selects nothing.
   */
  readonly tabChoices: { count: number }
}

const RETRY_MESSAGE = 'The request failed. Try again.'

export function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : RETRY_MESSAGE
}

/**
 * The server answered and refused the request. A failure with no answer, an
 * answer of a server error, or an answer that the chat cannot read is no
 * refusal, because the server can still have made the change.
 */
export function isRefusal(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500
}

export function showNotice(
  context: ChatContext,
  sessionId: string | null,
  title: string,
  error: unknown,
): void {
  if (!context.live()) return
  context.store.update((snapshot) => ({
    ...snapshot,
    notice: { sessionId, title, message: messageOf(error) },
  }))
}

/**
 * Shows a new transcript, and drops sent messages that it now holds. A
 * message whose send failed but that the transcript holds did send, so its
 * notice and its copy in a draft go, as `withLateSends` says. A Stop
 * that waits belongs to its turn, so it ends when that turn no longer runs,
 * also when another turn runs now.
 */
export function withTranscript(
  snapshot: ChatSnapshot,
  sessionId: string,
  transcript: Transcript,
  times: ReadonlyMap<string, number>,
): ChatSnapshot {
  const shown = new Set(
    transcript.items.flatMap((item) =>
      item.kind === 'user' ? [item.message.id] : [],
    ),
  )
  const next = withSession(snapshot, sessionId, (state) => {
    const running = transcript.turn?.turnId
    const same =
      running !== undefined && running === state.transcript.turn?.turnId
    return {
      ...state,
      transcript,
      times,
      pending: state.pending.filter((message) => !shown.has(message.id)),
      stopping: same ? state.stopping : false,
    }
  })
  return withLateSends(next, shown)
}
