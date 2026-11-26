import { nameLabel } from '../../../../src/shared/name-label'
import type { ExplainMarkState } from '../../../../src/ui/components/explain/explainCopy'
import type { WorkspaceTab } from '../components/workspace/TabItem'
import { explanations, type Explanation } from '../fixtures/explanations'
import type { ActivityStatus } from '../../../../src/ui/components/workspaces/activityStatus'
import { explainPaths } from './explainPaths'
import type { WorkspaceState } from './workspaceState'

export type ExplainSessionState = WorkspaceState['explainSession']

/** An explanation that the chat marks, with the state of its session. */
export type MarkedExplanation = {
  explanation: Explanation
  session: ExplainSessionState
}

/** The workspace is read-only: archived, or in a suspended org. */
export function explainReadOnly(state: WorkspaceState): boolean {
  return state.sandbox === 'archived' || state.org === 'suspended'
}

/** The chat of the first session shows, with the turn that the marks quote. */
export function parentShows(state: WorkspaceState): boolean {
  return state.tab === 'session' && state.conversation === 'history'
}

/** The popover of the explanation of Cal lies open over the parent chat. */
export function popoverOpen(state: WorkspaceState): boolean {
  switch (state.explainOpen) {
    case 'popover':
    case 'popover-full':
    case 'popover-resized':
      return parentShows(state)
    case 'none':
    case 'select':
    case 'select-message':
    case 'menu':
      return false
  }
}

/** The turn of the session runs, also while it waits for a member. */
export function explainRuns(session: ExplainSessionState): boolean {
  switch (session) {
    case 'working':
    case 'answering':
    case 'follow-up':
    case 'waiting':
      return true
    case 'answered':
    case 'failed':
    case 'stopped':
    case 'long':
    case 'closed':
      return false
  }
}

function allMarked(state: WorkspaceState): MarkedExplanation[] {
  const { count, lookup, proxy, tests, match } = explanations
  const asked = { explanation: count, session: state.explainSession }
  switch (state.explainMarks) {
    case 'none':
      return []
    case 'asked':
    case 'stale':
      return [asked]
    case 'states':
      return [
        asked,
        { explanation: lookup, session: 'working' },
        { explanation: proxy, session: 'answered' },
        { explanation: tests, session: 'failed' },
      ]
    case 'overlap':
      return [asked, { explanation: match, session: 'answered' }]
  }
}

/**
 * The explanations that the chat marks, in the order that they started.
 * While the sandbox does not run, no turn runs, so a session whose turn ran
 * shows as ended. While the sandbox starts, the first message waits for it,
 * so the explanation shows as running.
 */
export function markedExplanations(state: WorkspaceState): MarkedExplanation[] {
  const up = state.sandbox === 'ready' || state.sandbox === 'starting'
  const runs = up && state.org !== 'suspended'
  return allMarked(state).map((marked) =>
    runs || !explainRuns(marked.session)
      ? marked
      : { ...marked, session: 'answered' },
  )
}

/** The state that the mark of an explanation shows. */
export function markState(session: ExplainSessionState): ExplainMarkState {
  if (session === 'failed') return 'failed'
  if (session === 'waiting') return 'waiting'
  return explainRuns(session) ? 'running' : 'idle'
}

/**
 * The state of the explanation of Cal, as its mark, its popover, and its
 * tab show it.
 */
export function askedSession(state: WorkspaceState): ExplainSessionState {
  const asked = markedExplanations(state).find(
    (marked) => marked.explanation === explanations.count,
  )
  return asked?.session ?? state.explainSession
}

/**
 * What the explanations add to the state of the workspace, which the header
 * and the row of the list show: one that waits for a member, or one that
 * works. The agent of any session of the workspace counts.
 */
export function explainActivity(
  state: WorkspaceState,
): ActivityStatus | undefined {
  const sessions = markedExplanations(state).map((marked) => marked.session)
  if (sessions.includes('waiting')) return 'input'
  return sessions.some(explainRuns) ? 'working' : undefined
}

/**
 * The tabs of the open explanations, at the end of the row in the order
 * that they opened, as each new tab opens there. The parent tab stays the
 * shown tab. An explanation whose tab is closed has none, and the tab of
 * one that runs shows the spinner. `explanation` shows the tab of Cal after
 * Expand.
 */
export function explainTabs(state: WorkspaceState): WorkspaceTab[] {
  const shown = state.tab === 'explanation'
  const open = markedExplanations(state).filter(
    (marked) => marked.session !== 'closed',
  )
  const { count } = explanations
  if (shown && !open.some((marked) => marked.explanation === count)) {
    open.unshift({ explanation: count, session: 'answered' })
  }
  return open.map(({ explanation, session }) => ({
    key: explanation.key,
    kind: 'session',
    title: nameLabel(explanation.title),
    to: explanation === count ? explainPaths.tab : undefined,
    selected: shown && explanation === count,
    running: explainRuns(session),
  }))
}

/**
 * The page of the parent chat with no popover open, where the mockups draw
 * it: the page that the close button of the popover opens, and the page
 * that the chip of the parent in the written prompt opens. The mark keeps
 * the state of the explanation there.
 */
export function parentPage(state: WorkspaceState): string | undefined {
  if (explainReadOnly(state)) return explainPaths.readOnly
  if (state.sandbox !== 'ready') return undefined
  switch (askedSession(state)) {
    case 'working':
    case 'answering':
    case 'follow-up':
      return explainPaths.running
    case 'waiting':
      return explainPaths.marks
    case 'answered':
    case 'failed':
    case 'stopped':
    case 'long':
    case 'closed':
      return explainPaths.marks
  }
}

/** The page of the popover of the explanation of Cal, in its state. */
export function popoverPageOf(state: WorkspaceState): string {
  if (explainReadOnly(state)) return explainPaths.readOnlyPopover
  if (state.sandbox === 'starting') return explainPaths.starting
  if (state.sandbox === 'stopped') return explainPaths.computerStopped
  switch (askedSession(state)) {
    case 'working':
      return explainPaths.working
    case 'answering':
      return explainPaths.answering
    case 'answered':
      return explainPaths.answered
    case 'follow-up':
      return explainPaths.followUp
    case 'waiting':
      return explainPaths.waiting
    case 'failed':
      return explainPaths.failed
    case 'stopped':
      return explainPaths.stopped
    case 'long':
      return explainPaths.long
    case 'closed':
      return explainPaths.closed
  }
}
