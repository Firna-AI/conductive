import { defineScreen } from '@mokly/mokly'
import {
  feedbackDraft,
  FeedbackScreen,
  feedbackSchema,
} from '../../../../screens/FeedbackScreen'

export const feedbackLong = defineScreen({
  title: 'Long report',
  description:
    'Cal wrote twelve short lines and added three screenshots, and the send failed. On a phone the sheet stops below the top of the screen, as every sheet does. Its handle and its title stay. The message, the notice, the lines under it, and Cancel and Send scroll together in its body, so a scroll down reaches Cancel and Send, after the reply line. On desktop the dialog shows the whole form.',
  rationale:
    'A long form on a phone keeps every control within reach. The sheet already scrolls its body at its limit, so this page draws that rule with a long report, a failed send, and its notice. The draft keeps every line and screenshot, and no limit changes. Send stays after the reply line, so the reply address shows before the send, as decision 272 chose.',
  relatedDocs: [],
  propSchema: feedbackSchema,
  props: { ...feedbackDraft, draft: 'long', send: 'failed' },
  render: (props, context) => (
    <FeedbackScreen state={props} viewport={context.viewport} />
  ),
})
