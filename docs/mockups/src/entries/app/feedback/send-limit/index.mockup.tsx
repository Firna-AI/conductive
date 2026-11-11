import { defineScreen } from '@mokly/mokly'
import {
  feedbackDraft,
  FeedbackScreen,
  feedbackSchema,
} from '../../../../screens/FeedbackScreen'

export const feedbackSendLimit = defineScreen({
  title: 'Send limit',
  description:
    'Cal sent 10 messages in the last hour, then pressed Send on one more. The server refused the send, because each person can send 10 messages in an hour. The dialog keeps the text and the screenshot. The notice of a failed send shows under the box. It gives the limit and the time when a send can go again, as a date and a time in UTC. Send stays on: a press before that time shows the same notice, and a press after it sends the message.',
  rationale:
    'The user chose on 10 November 2026 that each person can send 10 feedback emails in an hour. Invitation and approval emails do not count. A send that the limit refused does not count either, so the time in the notice does not move. The notice is the notice of every failed send, with the message of the server: the draft stays, and Send tries again. The dialog adds no countdown and no wait on Send. The time is in UTC, with its date, so the words need no time zone of the person, and they stay true while the dialog stays open. The time rounds up to the next whole minute, so a send at the shown time goes.',
  relatedDocs: [],
  propSchema: feedbackSchema,
  props: { ...feedbackDraft, send: 'limited' },
  render: (props, context) => (
    <FeedbackScreen state={props} viewport={context.viewport} />
  ),
})
