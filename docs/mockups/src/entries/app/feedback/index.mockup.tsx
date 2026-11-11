import { defineScreen } from '@mokly/mokly'
import {
  feedbackDraft,
  FeedbackScreen,
  feedbackSchema,
} from '../../../screens/FeedbackScreen'

export const feedback = defineScreen({
  title: 'Feedback',
  description:
    'Cal chose Send feedback in the command palette over the list of Acme. The palette closed, and the Feedback dialog shows over the list. Cal wrote what went wrong and pasted a screenshot into the message box. The screenshot shows above the text as a chip with its name, its size, and Remove. Add screenshots opens the file picker, and a drop on the dialog adds a screenshot too. Two lines under the box say what the message also carries and where the team replies. On a computer, Enter sends, and Shift+Enter adds a line. On a phone the dialog is a sheet over the list.',
  rationale:
    'The user chose a dialog that the Worker sends by email to a team inbox, in decision 270, with screenshots and the context of the page, in decision 271. The team replies to the primary verified email of the GitHub account, which the dialog names before the send, as decision 272 chose. The dialog has no address and sits over the page, as the Archive question does. The message box follows the send key of every composer. Cancel, Escape, or a press outside closes the dialog and keeps the draft in the memory of the tab, so the next open shows it again. The states, the send limit, the reply address, the refusals, and a long report of the dialog are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: feedbackSchema,
  props: feedbackDraft,
  useCasePaths: ['user-flows/send-feedback'],
  render: (props, context) => (
    <FeedbackScreen state={props} viewport={context.viewport} />
  ),
})
