import { activityPresentation } from '../workspaces/status'

/**
 * The words of Explain: the button by a selection, the popover of an
 * explanation, the marks, and their menu. The docs call the panel by the
 * mark a popover, because "preview" names port previews. The screens name
 * only the action, Explain, and each explanation by its session title.
 */

/** The button by a finished selection in a message. */
export const explainLabel = 'Explain'

/** The action of the popover that shows the tab of the explanation. */
export const expandLabel = 'Expand'

export const closeLabel = 'Close'

/** The text of the empty follow-up field of the popover. */
export const followUpPlaceholder = 'Ask a follow-up'

/** The spoken name of the follow-up field of the popover. */
export const followUpLabel = 'Follow-up'

/** The spoken name of the chat of the explanation in its popover. */
export const popoverChatLabel = 'Chat of the explanation'

/**
 * The spoken names of the handles on the free edges of the popover of a
 * computer: the edge above or below the chat, and the edge at its side.
 */
export const resizeHeightLabel = 'Resize the height of the panel'
export const resizeWidthLabel = 'Resize the width of the panel'

/** The notice of the parent chat when a press on Explain started nothing. */
export const explainFailedTitle = "The explanation didn't start"

/** The title of the menu of overlapping marks. */
export const markMenuTitle = 'Explanations of this text'

/**
 * The notice over the follow-up field of an explanation whose tab is
 * closed. A send or Expand reopens the session, and its tab opens at the
 * end of the row, as each tab that opens again does.
 */
export const reopenTitle = 'The tab is closed'
export const reopenBody = 'A follow-up or Expand reopens it.'

/**
 * The state that a mark shows: the turn of its explanation ended, runs,
 * waits for a member, such as for the approval of a run with secrets, or
 * failed.
 */
export type ExplainMarkState = 'idle' | 'running' | 'waiting' | 'failed'

/** The words of each state: those of the header, and "Failed". */
const stateWords: Readonly<Record<ExplainMarkState, string>> = {
  idle: activityPresentation.ready.label,
  running: activityPresentation.working.label,
  waiting: activityPresentation.input.label,
  failed: 'Failed',
}

/**
 * What a screen reader hears for a mark: the title of its explanation, then
 * its state, such as "Needs input".
 */
export function markLabel(title: string, state: ExplainMarkState): string {
  return `${title}, ${stateWords[state]}`
}
