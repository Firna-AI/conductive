import type { AgentModel } from '../../shared/agents'
import type { BoatKeyStatus } from '../../shared/api'
import type { Attachment, UserMessage } from '../../shared/messages'
import type { Session } from '../../shared/sessions'
import type { WorkspaceView } from '../../shared/workspace-view'
import type { Workspace, WorkspaceStart } from '../../shared/workspaces'
import type { AccountSummary, OrgSummary } from '../api/read-responses'
import { emptyTranscript, type Transcript } from './transcript'

export interface Draft {
  text: string
  attachments: readonly Attachment[]
  /** The client ID of a send that failed, so that a resend is one message. */
  sendId: string | null
}

export interface SessionState {
  transcript: Transcript
  hydration: 'idle' | 'loading' | 'ready' | 'failed'
  draft: Draft
  /** Sent messages that the stream has not shown yet. */
  pending: readonly UserMessage[]
  sending: boolean
  /** Files that still upload. Send waits until they are attached. */
  uploads: number
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

export type LoadState =
  | { state: 'loading' }
  | { state: 'ready' }
  | { state: 'failed'; message: string }

export interface ChatSnapshot {
  load: LoadState
  workspace: Workspace | null
  start: WorkspaceStart | null
  org: OrgSummary | null
  boatKey: Pick<BoatKeyStatus, 'configured'> | null
  account: AccountSummary | null
  models: readonly AgentModel[]
  /** Open sessions, in the order of their tabs. */
  sessions: readonly Session[]
  /** Closed sessions, the last closed first. */
  history: readonly Session[]
  view: WorkspaceView | null
  activeSessionId: string | null
  sessionStates: Readonly<Record<string, SessionState>>
  overlay: Overlay
  notice: ChatNotice | null
  resuming: boolean
}

export const emptyDraft: Draft = { text: '', attachments: [], sendId: null }

export const initialSession: SessionState = {
  transcript: emptyTranscript,
  hydration: 'idle',
  draft: emptyDraft,
  pending: [],
  sending: false,
  uploads: 0,
  stopping: false,
  retrying: false,
}

export const initialSnapshot: ChatSnapshot = {
  load: { state: 'loading' },
  workspace: null,
  start: null,
  org: null,
  boatKey: null,
  account: null,
  models: [],
  sessions: [],
  history: [],
  view: null,
  activeSessionId: null,
  sessionStates: {},
  overlay: { kind: 'none' },
  notice: null,
  resuming: false,
}

/** The state of one session, with its defaults before anything loads. */
export function sessionState(
  snapshot: ChatSnapshot,
  sessionId: string,
): SessionState {
  return snapshot.sessionStates[sessionId] ?? initialSession
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

/** A session runs a turn: its transcript says so, or its record before it loads. */
export function isRunning(snapshot: ChatSnapshot, sessionId: string): boolean {
  const state = sessionState(snapshot, sessionId)
  if (state.transcript.turn) return true
  if (state.hydration === 'ready') return false
  const session = snapshot.sessions.find((item) => item.id === sessionId)
  return session?.activeTurnId != null
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
