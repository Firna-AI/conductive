import { ApiError } from '../../app/api/client'
import type { WorkspaceView } from '../../shared/workspace-view'
import type { ChatApi, WorkspaceTarget } from '../api/client'
import type { DeviceChannel } from '../device/device-actions'
import type { WorkspaceStream } from '../stream/workspace-stream'
import { withSession, type ChatSnapshot, type ChatStore } from './chat-snapshot'
import type { PendingMove } from './model-moves'
import type { PendingEdit } from './session-records'
import type { Transcript } from '../../shared/transcript/transcript'

/** What the chat's actions share: the API, the store, the logs, and the stream. */
export interface ChatContext {
  readonly target: WorkspaceTarget
  readonly api: ChatApi
  readonly store: ChatStore
  readonly stream: WorkspaceStream
  /** The running history load of each session, so that loads are shared. */
  readonly loading: Map<string, Promise<number | null>>
  /** The rename and model edits that wait for their replies, by session. */
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
   * The client ID of each fixed prompt that did not send, by its session and
   * its text. So a second try in that session is the same message, and the
   * same prompt in another session is a new one.
   */
  readonly prompts: Map<string, string>
  /** A new identity for a draft that a session starts after its draft moved. */
  readonly newDraftId: () => string
  /** A new local identity for a file of a draft, in this tab. */
  readonly newFileId: () => string
  /**
   * The uploads that run, by file ID. Remove aborts the upload of its file,
   * and a stop of the chat aborts each one.
   */
  readonly uploads: Map<string, AbortController>
  readonly saveView: (view: WorkspaceView) => void
  /** The chat is still open. A response that arrives later changes nothing. */
  readonly live: () => boolean
  /**
   * App models own the account, the org, the models, and the members, so
   * the load reads none of them, as `ChatSources` says.
   */
  readonly owned: boolean
  /** The routes of Mac commands, and the number of their latest read. */
  readonly devices: DeviceChannel
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
 * Shows a new transcript, and drops sent messages that it now holds. A Stop
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
  return withSession(snapshot, sessionId, (state) => {
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
}

/** Saves the view one request at a time. A newer view replaces one that waits. */
export function viewWriter(
  save: (view: WorkspaceView) => Promise<unknown>,
): (view: WorkspaceView) => void {
  let waiting: WorkspaceView | null = null
  let writing = false
  const flush = async () => {
    if (writing || !waiting) return
    const view = waiting
    waiting = null
    writing = true
    try {
      await save(view)
    } catch {
      // The next change sends the whole view again.
    } finally {
      writing = false
      void flush()
    }
  }
  return (view) => {
    waiting = view
    void flush()
  }
}
