import { activityPresentation } from '../workspaces/status'

/**
 * The words of side questions: the button by a selection, the prompt
 * field, the marks, their menu, and the overlay of a side session. The
 * docs call the feature a side question, and the screens name only the
 * action and the sessions.
 */

/** The button by a finished selection in a message. */
export const askLabel = 'Ask about this'

/** The spoken name of the prompt field. */
export const promptLabel = 'Question'

export const promptPlaceholder = 'Ask about the selected text'

/** The line beside Send, which says where the question goes. */
export const promptHint = 'Starts a new session'

/** The action of the overlay that shows the tab of the side session. */
export const openAsTabLabel = 'Open as tab'

export const closeOverlayLabel = 'Close'

/** The title of the menu of overlapping marks. */
export const markMenuTitle = 'Questions about this text'

/**
 * The notice over the composer of a closed side session. A send reopens
 * the session, and its tab opens at the end of the row, as each tab that
 * opens again does.
 */
export const reopenTitle = 'Your message reopens this session'
export const reopenBody = 'Its tab opens at the end of the row.'

/**
 * The run state that a mark shows: the turn of its session ended, runs, or
 * waits for a member, such as for the approval of a run with secrets.
 */
export type SideMarkState = 'idle' | 'running' | 'waiting'

const stateStatus = {
  idle: 'ready',
  running: 'working',
  waiting: 'input',
} as const

/**
 * What a screen reader hears for a mark: the title of its session, then
 * its state, in the words of the header, such as "Needs input".
 */
export function markLabel(title: string, state: SideMarkState): string {
  return `${title}, ${activityPresentation[stateStatus[state]].label}`
}
