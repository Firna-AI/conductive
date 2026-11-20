import { defineScreen } from '@mokly/mokly'
import {
  feedbackDraft,
  FeedbackScreen,
  feedbackSchema,
} from '../../../../screens/FeedbackScreen'

export const feedbackSendLimit = defineScreen({
  title: 'Send limit',
  description:
    'Cal sent 10 feedback messages in the last hour, then pressed Send again. The server refused the send, and the dialog stays open with the text and the screenshot. The notice under the box says "The feedback wasn\'t sent", then "You can send up to 10 feedback messages an hour. Try again at 15:02." Send stays on. From 15:02, Cal can try again. An earlier press shows the same notice again. On a phone the sheet shows the same notice.',
  rationale:
    'The user chose this limit for decision 276 on 10 November 2026: 10 feedback sends in an hour for each person. Only feedback counts, so the limit never refuses an invitation or an approval email. The server answers a send over the limit with HTTP 429 and the time when the person can try again. The dialog shows that time on the 24-hour clock, in the time zone of the browser. It rounds the time up to the minute, so the shown time is never before the time that the server gives. The wait is at most an hour, so the time needs no date. A clock time stays true while the dialog is open, so the dialog needs no countdown. The notice is the notice of each failed send, so the draft stays, and Send tries again. The notice is an alert, so a screen reader reads its title and its time.',
  relatedDocs: [],
  propSchema: feedbackSchema,
  props: { ...feedbackDraft, send: 'over-limit' },
  render: (props, context) => (
    <FeedbackScreen state={props} viewport={context.viewport} />
  ),
})
