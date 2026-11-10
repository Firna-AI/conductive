import type { DraftFile } from '../../app/draft-files'
import type { AgentModel } from '../../shared/agents'
import type { UserMessage } from '../../shared/messages'
import type { Session } from '../../shared/sessions'
import type { WorkspaceView } from '../../shared/workspace-view'
import type { Workspace, WorkspaceStart } from '../../shared/workspaces'
import type {
  AccountSummary,
  MemberSummary,
  OrgSummary,
} from '../api/read-responses'
import { initialDevices, type DeviceSnapshot } from '../device/device-snapshot'
import { emptyTranscript, type Transcript } from './transcript'
import { startedTurn } from './turn-records'

/**
 * The message that a user writes in a session. Its identity stays when the
 * draft moves to another session, so the uploads and the send that it
 * started finish on the draft, wherever it is then.
 */
export interface Draft {
  id: string
  text: string
  /**
   * The files, in the order of the picks, each with its upload. Send waits
   * while one uploads or failed, and takes only ready ones.
   */
  files: readonly DraftFile[]
  /** The names of the files of the last pick that are over the size limit. */
  refused: readonly string[]
  /** The client ID of a send that failed, so that a resend is one message. */
  sendId: string | null
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
   * The message that the workspace saved for its failed start, which the
   * bar of the chat shows. Null when the workspace saved none.
   */
  savedError: string | null
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
    files: [],
    refused: [],
    sendId: null,
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
  savedError: null,
  org: null,
  account: null,
  members: [],
  models: [],
  sessions: [],
  history: [],
  archiveTabs: null,
  view: null,
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

/**
 * A turn runs or stops in a session of the workspace, open or closed, as
 * its record or its transcript says. A record names a started turn as
 * `startedTurn` says, so a message that waits for dispatch runs no turn.
 * The transcript also shows a turn that started before a record names it.
 */
export function anyTurnRuns(snapshot: ChatSnapshot): boolean {
  const records = [...snapshot.sessions, ...snapshot.history]
  return (
    records.some((session) => startedTurn(session) !== null) ||
    snapshot.sessions.some((session) => isRunning(snapshot, session.id))
  )
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
