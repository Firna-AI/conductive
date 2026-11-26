import { defineComponent } from '@mokly/mokly'
import {
  ReplyFailure,
  ReplyLine,
} from '../../../components/feedback/FeedbackReply'
import { replyEmail } from '../../../fixtures/feedback'
import { paths } from '../../../paths'
import { replySchema } from './feedbackSchemas'

/** The line that says where the team replies, registered with Mokly. */
export const replyLine = defineComponent({
  slug: 'reply-line',
  title: 'Reply line',
  description:
    'The line of the Feedback dialog that says where the team replies: the primary verified email of the GitHub account, or that no email can get a reply. While the read of the address runs, a spinner takes the place of its icon. A failed read has no line. Its own page shows the address of Cal.',
  relatedDocs: ['docs/mockups/catalogue-palette.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['reply'],
    properties: { reply: replySchema },
  } as const,
  props: { reply: { state: 'ready', email: replyEmail } },
  render: (props) => <ReplyLine reply={props.reply} />,
  variants: [
    {
      slug: 'loading',
      title: 'Loading',
      description: 'The read of the address runs: a spinner.',
      props: { reply: { state: 'loading' } },
    },
    {
      slug: 'no-email',
      title: 'No email',
      description: 'An account without a primary verified email.',
      props: { reply: { state: 'ready', email: null } },
    },
  ],
})

/** The notice of a read of the reply address that failed, registered with Mokly. */
export const replyFailure = defineComponent({
  slug: 'reply-failure',
  title: 'Reply failure',
  description:
    'The notice of a read of the reply address that failed, after the lines of the Feedback dialog and beside Send, which waits for the read: what failed, the message of the server, and Try again. It draws nothing while the read runs or after it worked.',
  relatedDocs: ['docs/mockups/catalogue-palette.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['reply'],
    properties: {
      reply: replySchema,
      /** The screen that Try again leads to, when the mockups draw it. */
      retryTo: { type: 'string', minLength: 1 },
    },
  } as const,
  props: { reply: { state: 'failed' }, retryTo: paths.feedback },
  render: (props) => (
    <ReplyFailure reply={props.reply} retryTo={props.retryTo} />
  ),
})
