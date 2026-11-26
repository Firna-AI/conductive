import { defineComponent } from '@mokly/mokly'
import { FeedbackDialog } from '../../../components/feedback/FeedbackDialog'
import { offlineMessage } from '../../../components/common/LoadFailure'
import {
  feedbackMessage,
  feedbackScreenshot,
  replyEmail,
} from '../../../fixtures/feedback'
import { paths } from '../../../paths'
import { viewports } from '../common/viewports'
import {
  problemSchema,
  replySchema,
  screenshotsSchema,
} from './feedbackSchemas'

/**
 * The Feedback dialog, drawn open, registered with Mokly. A screen that
 * draws a screen of another viewport passes `viewport`. Without it, a page
 * of the dialog draws the layout of its own view.
 */
export const feedbackDialog = defineComponent({
  slug: 'feedback-dialog',
  title: 'Feedback dialog',
  description:
    'The Feedback dialog, drawn open: a wide dialog on desktop, and a sheet on a phone. The message box has the focus, with the screenshots of the draft above its text and Add screenshots under it. Two lines say what the message also carries and where the team replies. A notice under the box names a file that the dialog did not add, or a send that failed. Send waits for text and for the reply address. Its own page shows a message with a screenshot.',
  relatedDocs: ['docs/mockups/catalogue-palette.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['text', 'screenshots', 'reply'],
    properties: {
      /** The text of the message box. */
      text: { type: 'string' },
      screenshots: screenshotsSchema,
      /** The read of the reply address, which Send waits for. */
      reply: replySchema,
      problem: problemSchema,
      /** The send runs, so the dialog takes no change and stays open. */
      sending: { type: 'boolean' },
      /** The screen that Send leads to, when the mockups draw it. */
      sendTo: { type: 'string', minLength: 1 },
      /** The screen that Try again of a failed read leads to, when drawn. */
      retryTo: { type: 'string', minLength: 1 },
      /** The viewport of the screen, when it differs from the view. */
      viewport: { enum: viewports },
    },
  } as const,
  props: {
    text: feedbackMessage,
    screenshots: [feedbackScreenshot],
    reply: { state: 'ready', email: replyEmail },
    sendTo: paths.feedbackSending,
    retryTo: paths.feedback,
  },
  render: (props, context) => (
    <FeedbackDialog
      problem={props.problem}
      reply={props.reply}
      retryTo={props.retryTo}
      screenshots={props.screenshots}
      sendTo={props.sendTo}
      sending={props.sending}
      text={props.text}
      viewport={props.viewport ?? context.viewport}
    />
  ),
  variants: [
    {
      slug: 'empty',
      title: 'Empty',
      description: 'The dialog as it opens without a kept draft: Send waits.',
      props: { text: '', screenshots: [] },
    },
    {
      slug: 'sending',
      title: 'Sending',
      description:
        'The send runs: a spinner leads Send, and the dialog takes no change.',
      props: { sending: true },
    },
    {
      slug: 'not-sent',
      title: 'Not sent',
      description:
        'A send that failed: the notice with the message of the server, and the kept draft.',
      props: { problem: { kind: 'not-sent', message: offlineMessage } },
    },
    {
      slug: 'reply-failed',
      title: 'Reply address failed',
      description:
        'The read of the reply address failed: its notice with Try again, and Send waits.',
      props: { reply: { state: 'failed' } },
    },
  ],
})
