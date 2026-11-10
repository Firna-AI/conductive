import type { AgentModel } from '../../shared/agents'
import type { Attachment, UserMessage } from '../../shared/messages'
import type { Session } from '../../shared/sessions'
import type { WorkspaceView } from '../../shared/workspace-view'
import type { Workspace, WorkspaceStart } from '../../shared/workspaces'
import type {
  AccountSummary,
  MemberSummary,
  OrgSummary,
  RunRoutine,
} from '../api/read-responses'
import { initialDevices, type DeviceSnapshot } from '../device/device-snapshot'
import { emptyTranscript, type Transcript } from './transcript'

/**
 * The message that a user writes in a session. Its identity stays when the
 * draft moves to another session, so the uploads and the send that it
 * started finish on the draft, wherever it is then.
 */
export interface Draft {
  id: string
  text: string
  attachments: readonly Attachment[]
  /** The client ID of a send that failed, so that a resend is one message. */
  sendId: string | null
  /** Files that still upload. Send waits until they are attached. */
  uploads: number
  /** A send of this draft waits for its answer. */
  sending: boolean
}

export interface SessionState {
  transcript: Transcript
  /** The time of the first event of each transcript item, by its ID. */
  times: ReadonlyMap<string, number>
  hydration: 'idle' | 'loading' | 'ready' | 'failed'
  draft: Draft
  /** Sent messages that the stream has not shown yet. */
  pending: readonly UserMessage[]
  stopping: boolean
  retrying: boolean
}

export type Overlay =
  | { kind: 'none' }
  | { kind: 'history' }
  | { kind: 'close'; sessionId: string }
  | { kind: 'rename'; sessionId: string }

/** A failed action, shown above the composer until the user dismisses it. */
export interface ChatNotice {
  /** The session of the action, or null for the workspace. */
  sessionId: string | null
  title: string
  message: string
}

type LoadState =
  | { state: 'loading' }
  | { state: 'ready' }
  | { state: 'failed'; message: string }

export interface ChatSnapshot {
  load: LoadState
  workspace: Workspace | null
  start: WorkspaceStart | null
  /**
   * The records showed that the first start of the workspace succeeded, as
   * `first-start.ts` says. Until then, Send waits.
   */
  firstStartDone: boolean
  org: OrgSummary | null
  account: AccountSummary | null
  /** The members of the org, which name the member who stopped a turn. */
  members: readonly MemberSummary[]
  models: readonly AgentModel[]
  /** Open sessions, in the order of their tabs. */
  sessions: readonly Session[]
  /** Closed sessions, the last closed first. */
  history: readonly Session[]
  /**
   * The IDs of the session tabs of an archived workspace, which change in
   * the browser only, as `archive-view.ts` says. Null while the tabs are the
   * open sessions.
   */
  archiveTabs: readonly string[] | null
  view: WorkspaceView | null
  /**
   * The routine whose run made the workspace, from the read of the view.
   * Null for a workspace that a person created, and until the view reads.
   */
  routine: RunRoutine | null
  activeSessionId: string | null
  sessionStates: Readonly<Record<string, SessionState>>
  overlay: Overlay
  notice: ChatNotice | null
  resuming: boolean
  /** The Mac commands of the workspace, as `device/device-snapshot.ts` says. */
  devices: DeviceSnapshot
}

/** A draft with nothing in it, and no work in flight. */
export function blankDraft(id: string): Draft {
  return {
    id,
    text: '',
    attachments: [],
    sendId: null,
    uploads: 0,
    sending: false,
  }
}

const initialSession: Omit<SessionState, 'draft'> = {
  transcript: emptyTranscript,
  times: new Map(),
  hydration: 'idle',
  pending: [],
  stopping: false,
  retrying: false,
}

export const initialSnapshot: ChatSnapshot = {
  load: { state: 'loading' },
  workspace: null,
  start: null,
  firstStartDone: false,
  org: null,
  account: null,
  members: [],
  models: [],
  sessions: [],
  history: [],
  archiveTabs: null,
  view: null,
  routine: null,
  activeSessionId: null,
  sessionStates: {},
  overlay: { kind: 'none' },
  notice: null,
  resuming: false,
  devices: initialDevices,
}

/**
 * The state of one session, with its defaults before anything loads. The
 * first draft of a session takes its identity from the session.
 */
export function sessionState(
  snapshot: ChatSnapshot,
  sessionId: string,
): SessionState {
  return (
    snapshot.sessionStates[sessionId] ?? {
      ...initialSession,
      draft: blankDraft(`draft:${sessionId}`),
    }
  )
}

export function withSession(
  snapshot: ChatSnapshot,
  sessionId: string,
  change: (state: SessionState) => SessionState,
): ChatSnapshot {
  return {
    ...snapshot,
    sessionStates: {
      ...snapshot.sessionStates,
      [sessionId]: change(sessionState(snapshot, sessionId)),
    },
  }
}

/**
 * A session runs a turn. Its transcript says so from the events and the
 * records of the session, so a record shows a running turn also before the
 * history loads, or when it fails.
 */
export function isRunning(snapshot: ChatSnapshot, sessionId: string): boolean {
  return sessionState(snapshot, sessionId).transcript.turn !== null
}

/** Holds the snapshot, and tells React when it changes. */
export class ChatStore {
  private snapshot: ChatSnapshot = initialSnapshot
  private readonly listeners = new Set<() => void>()

  get = (): ChatSnapshot => this.snapshot

  update(change: (snapshot: ChatSnapshot) => ChatSnapshot): void {
    const next = change(this.snapshot)
    if (next === this.snapshot) return
    this.snapshot = next
    for (const listener of this.listeners) listener()
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
