import { nameLabel } from '../../../../src/shared/name-label'
import type { WorkspaceTab } from '../components/workspace/TabItem'
import type { AgentChoice } from '../fixtures/agents'
import {
  oldSessions,
  openOldSession,
  type OldSession,
} from '../fixtures/conductorImport'
import type { ChatItem } from '../fixtures/conversations'
import {
  resumedChoice,
  resumedConversations,
  resumedSessions,
  type ResumeOutcome,
} from '../fixtures/resumedSessions'
import { newSession } from '../fixtures/sessions'
import { importedScreensOf } from './importedScreens'
import { isImported } from './importedWorkspace'
import type { WorkspaceState } from './workspaceState'

/**
 * Whether the activation of the workspace succeeded, so its sessions from
 * Conductor continue as session tabs: while it is ready, and after it
 * stopped.
 */
function activated(state: WorkspaceState): boolean {
  return state.sandbox === 'ready' || state.sandbox === 'stopped'
}

/** The drawn outcome of a session from Conductor, if the mockups draw one. */
function outcomeOf(session: OldSession): ResumeOutcome | undefined {
  if (session.key === resumedSessions.memory.key) return 'memory'
  if (session.key === resumedSessions.fallback.key) return 'fallback'
  return undefined
}

/** The session from Conductor that the `session` tab shows, if any. */
function shownOutcome(state: WorkspaceState): ResumeOutcome | undefined {
  const shows = isImported(state) && activated(state) && state.tab === 'session'
  return shows && state.resume !== 'none' ? state.resume : undefined
}

/**
 * The tab of each session from Conductor, oldest first, once the
 * activation restored its memory. Each opens its own chat in the same
 * state, where the mockups draw one, and stays static otherwise.
 */
function resumedTabs(state: WorkspaceState): WorkspaceTab[] {
  if (!activated(state)) return []
  const shown = shownOutcome(state)
  return [...oldSessions].reverse().map((session) => {
    const outcome = outcomeOf(session)
    const chat = outcome
      ? importedScreensOf({ ...state, tab: 'session', resume: outcome }).chat
      : null
    return {
      key: session.key,
      kind: 'session',
      title: session.title,
      to: chat ?? undefined,
      selected: outcome !== undefined && outcome === shown,
    }
  })
}

/**
 * The tabs of an imported workspace. Before its activation it has no
 * session, so only the Markdown of an old session opens a tab. From its
 * activation on, the composer starts a new session, which shows Untitled
 * until its first message. After the activation, the sessions from
 * Conductor come first, each in its own tab.
 */
export function importedTabs(state: WorkspaceState): WorkspaceTab[] {
  const old = state.tab === 'old-session'
  const screens = importedScreensOf(state)
  const tabs = resumedTabs(state)
  // Before an activation, and after an archive before it, nothing starts a
  // session.
  if (state.sandbox !== 'inactive' && state.sandbox !== 'archived-inactive') {
    const chat = importedScreensOf({
      ...state,
      tab: 'new-session',
      resume: 'none',
    }).chat
    tabs.push({
      key: newSession.key,
      kind: 'session',
      title: nameLabel(newSession.title),
      to: chat ?? undefined,
      selected: !old && shownOutcome(state) === undefined,
    })
  }
  if (old) {
    tabs.push({
      key: 'old-session',
      kind: 'markdown',
      title: openOldSession.title,
      to: screens.document ?? undefined,
      selected: true,
    })
  }
  return tabs
}

/**
 * The chat of the session tab of an imported workspace: the new turns of
 * a session from Conductor, after its first line, which opens its old
 * document where the mockups draw it. Every other tab has no item, so it
 * shows the links to the old sessions.
 */
export function importedItems(state: WorkspaceState): readonly ChatItem[] {
  const outcome = shownOutcome(state)
  if (outcome === undefined) return []
  const { document } = importedScreensOf(state)
  const own = resumedSessions[outcome].key === openOldSession.key
  return resumedConversations[outcome].map((item) =>
    item.kind === 'resumed' && own && document !== null
      ? { ...item, to: document }
      : item,
  )
}

/**
 * The model of the session tab of an imported workspace: a session from
 * Conductor keeps its agent. Other tabs use the model of the workspace.
 */
export function resumedChoiceOf(
  state: WorkspaceState,
): AgentChoice | undefined {
  const outcome = shownOutcome(state)
  return outcome === undefined
    ? undefined
    : resumedChoice(resumedSessions[outcome])
}
