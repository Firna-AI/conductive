import { defineScreen } from '@mokly/mokly'
import {
  feedbackDraft,
  FeedbackScreen,
  feedbackSchema,
} from '../../../../screens/FeedbackScreen'

export const feedbackReply = defineScreen({
  title: 'Reply address',
  description:
    'Cal opens the dialog again, and the kept draft shows at once. The app reads the reply address at each open. While it loads, a spinner leads the reply line, "Loading the reply address". Cal can still write, add or remove screenshots, and Cancel. Send waits until the read is ready.',
  rationale:
    'Decision 272 shows the reply address before the send, so Send waits for the read. The line keeps its place, so nothing moves when the address arrives. A ready read without an email still lets Cal send, as `app/feedback/states/no-reply-address` shows. The read adds no new refusal: it only decides when Send is on.',
  relatedDocs: [],
  propSchema: feedbackSchema,
  props: { ...feedbackDraft, reply: 'loading' },
  render: (props, context) => (
    <FeedbackScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'Reply address not loaded',
      description:
        'The read of the reply address failed, because the app could not reach the server. A notice takes the place of the reply line, beside Send: "The reply address didn\'t load", with the message of the server and Try again, which reads the address again. The draft, the screenshots, and Cancel stay available, and Send waits.',
      rationale:
        'The notice is the notice of every read that failed, as the workspace list shows it. Send stays off until a read is ready, so the person always sees where the team replies before the send.',
      props: { reply: 'failed' },
    },
  ],
})
