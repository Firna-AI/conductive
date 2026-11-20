import { nameLabel } from '../../../../src/shared/name-label'
import type { SideMarkState } from '../components/side-questions/sideQuestionCopy'
import type { WorkspaceTab } from '../components/workspace/TabItem'
import { sideQuestions, type SideQuestion } from '../fixtures/sideQuestions'
import type { ActivityStatus } from '../fixtures/workspaces'
import { sideQuestionPaths } from './sideQuestionPaths'
import type { WorkspaceState } from './workspaceState'

export type SideSessionState = WorkspaceState['sideSession']

/** A side question that the chat marks, with the run state of its session. */
export type MarkedQuestion = {
  question: SideQuestion
  session: SideSessionState
}

/** The workspace is read-only: archived, or in a suspended org. */
export function sideReadOnly(state: WorkspaceState): boolean {
  return state.sandbox === 'archived' || state.org === 'suspended'
}

/** The chat of the first session shows, with the turn that the marks quote. */
export function parentShows(state: WorkspaceState): boolean {
  return state.tab === 'session' && state.conversation === 'history'
}

function allMarked(state: WorkspaceState): MarkedQuestion[] {
  const { count, lookup, proxy, match } = sideQuestions
  const asked = { question: count, session: state.sideSession }
  switch (state.sideMarks) {
    case 'none':
      return []
    case 'asked':
    case 'stale':
      return [asked]
    case 'states':
      return [
        asked,
        { question: lookup, session: 'running' },
        { question: proxy, session: 'idle' },
      ]
    case 'overlap':
      return [asked, { question: match, session: 'idle' }]
  }
}

/**
 * The side questions that the chat marks, in the order that they were
 * asked. While the sandbox does not run, no turn runs, so a session whose
 * turn ran shows as ended.
 */
export function markedQuestions(state: WorkspaceState): MarkedQuestion[] {
  const runs = state.sandbox === 'ready' && state.org !== 'suspended'
  return allMarked(state).map((marked) =>
    runs || !sideRuns(marked.session) ? marked : { ...marked, session: 'idle' },
  )
}

/** The turn of the session runs, also while it waits for a member. */
export function sideRuns(session: SideSessionState): boolean {
  return session === 'running' || session === 'waiting'
}

/** The state that the mark of a session shows. A closed session has ended. */
export function markState(session: SideSessionState): SideMarkState {
  return session === 'closed' ? 'idle' : session
}

/**
 * The run state of the side session of Cal, as the overlay and the tab
 * show it.
 */
export function askedSession(state: WorkspaceState): SideSessionState {
  const asked = markedQuestions(state).find(
    (marked) => marked.question === sideQuestions.count,
  )
  return asked?.session ?? state.sideSession
}

/**
 * What the side sessions add to the state of the workspace, which the
 * header and the row of the list show: a side session that waits for a
 * member, or one that works. The agent of any session of the workspace
 * counts.
 */
export function sideActivity(
  state: WorkspaceState,
): ActivityStatus | undefined {
  const sessions = markedQuestions(state).map((marked) => marked.session)
  if (sessions.includes('waiting')) return 'input'
  return sessions.includes('running') ? 'working' : undefined
}

/**
 * The tabs of the open side sessions, at the end of the row in the order
 * that they opened, as each new tab opens there. The parent tab stays the
 * shown tab. A closed side session has no tab, and the tab of a session
 * that runs shows the spinner. `side-session` shows the tab of Cal after
 * Open as tab.
 */
export function sideTabs(state: WorkspaceState): WorkspaceTab[] {
  const shown = state.tab === 'side-session'
  const open = markedQuestions(state).filter(
    (marked) => marked.session !== 'closed',
  )
  const { count } = sideQuestions
  if (shown && !open.some((marked) => marked.question === count)) {
    open.unshift({ question: count, session: 'idle' })
  }
  return open.map(({ question, session }) => ({
    key: question.key,
    kind: 'session',
    title: nameLabel(question.title),
    to: question === count ? sideQuestionPaths.tab : undefined,
    selected: shown && question === count,
    running: sideRuns(session),
  }))
}

/**
 * The page of the parent chat while the side session of Cal shows, where
 * the mockups draw it: the page that the close button of its overlay
 * opens, and the page that the chip of the parent in its first message
 * opens. Its mark keeps the state of the session there.
 */
export function parentPage(state: WorkspaceState): string | undefined {
  if (sideReadOnly(state)) return sideQuestionPaths.readOnly
  switch (askedSession(state)) {
    case 'running':
      return sideQuestionPaths.asked
    case 'waiting':
      return sideQuestionPaths.marks
    case 'idle':
    case 'closed':
      return undefined
  }
}

/** The chat of a side session shows: in its overlay, or in its tab. */
export function sideChatShows(state: WorkspaceState): boolean {
  const overlay = state.sideOpen === 'overlay' && parentShows(state)
  return overlay || state.tab === 'side-session'
}
